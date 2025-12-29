-- Push Notification Gönderme Fonksiyonları
-- Bu migration Expo Push Notification gönderme fonksiyonlarını ekler

-- HTTP extension'ı etkinleştir (eğer yoksa)
CREATE EXTENSION IF NOT EXISTS http;

-- Push notification gönderme fonksiyonu
CREATE OR REPLACE FUNCTION send_push_notification(
  push_token TEXT,
  title TEXT,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response http_response;
  payload JSONB;
BEGIN
  -- Token kontrolü
  IF push_token IS NULL OR push_token = '' THEN
    RAISE WARNING 'Push token is null or empty';
    RETURN FALSE;
  END IF;

  -- Expo push notification payload'ı hazırla (FCM olmadan)
  payload := jsonb_build_object(
    'to', push_token,
    'title', title,
    'body', body,
    'data', data,
    'sound', 'default',
    'priority', 'high'
  );

  RAISE WARNING 'Sending push notification: %', payload::text;

  -- Expo Push API'ye istek gönder
  SELECT * INTO response
  FROM http((
    'POST',
    'https://exp.host/--/api/v2/push/send',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Accept', 'application/json'),
      http_header('Accept-Encoding', 'gzip, deflate')
    ],
    'application/json',
    payload::text
  ));

  RAISE WARNING 'Push API response: Status=%, Content=%', response.status, response.content;

  -- Başarı kontrolü
  IF response.status = 200 THEN
    RETURN TRUE;
  ELSE
    -- Hata logla
    RAISE WARNING 'Push notification failed: % - %', response.status, response.content;
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Push notification error: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Kullanıcıya push notification gönderme fonksiyonu
CREATE OR REPLACE FUNCTION send_push_to_user(
  user_id UUID,
  title TEXT,
  body TEXT,
  notification_type TEXT DEFAULT 'general',
  extra_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_push_token TEXT;
  notification_data JSONB;
  success BOOLEAN := FALSE;
BEGIN
  -- Kullanıcının push token'ını al
  SELECT push_token INTO user_push_token
  FROM profiles
  WHERE id = user_id AND push_token IS NOT NULL;

  -- Token yoksa false döndür
  IF user_push_token IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Notification data'sını hazırla
  notification_data := jsonb_build_object(
    'type', notification_type,
    'userId', user_id,
    'timestamp', extract(epoch from now())
  ) || extra_data;

  -- Push notification gönder
  SELECT send_push_notification(
    user_push_token,
    title,
    body,
    notification_data
  ) INTO success;

  RETURN success;
END;
$$;

-- Yeni başvuru geldiğinde push notification gönder
CREATE OR REPLACE FUNCTION notify_new_request_with_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_owner UUID;
  requester_name TEXT;
  proposal_name TEXT;
  push_success BOOLEAN;
BEGIN
  -- Teklif sahibini ve bilgileri al
  SELECT creator_id, activity_name INTO proposal_owner, proposal_name
  FROM proposals
  WHERE id = NEW.proposal_id;
  
  -- Başvuran kişinin adını al
  SELECT name INTO requester_name
  FROM profiles
  WHERE id = NEW.requester_id;
  
  -- Database'e bildirim oluştur
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    proposal_owner,
    'new_request',
    'Yeni Başvuru!',
    requester_name || ' "' || proposal_name || '" teklifine başvurdu',
    jsonb_build_object(
      'request_id', NEW.id,
      'proposal_id', NEW.proposal_id,
      'requester_id', NEW.requester_id,
      'is_super_like', NEW.is_super_like
    )
  );

  -- Push notification gönder
  SELECT send_push_to_user(
    proposal_owner,
    'Yeni Başvuru! 🎯',
    requester_name || ' teklifinize başvurdu',
    'proposal',
    jsonb_build_object(
      'requestId', NEW.id,
      'proposalId', NEW.proposal_id,
      'requesterId', NEW.requester_id,
      'isSuperLike', NEW.is_super_like
    )
  ) INTO push_success;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Başvuru kabul edildiğinde push notification gönder
CREATE OR REPLACE FUNCTION handle_request_acceptance_with_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_owner UUID;
  requester_name TEXT;
  owner_name TEXT;
  proposal_name TEXT;
  push_success BOOLEAN;
BEGIN
  -- Sadece accepted durumuna geçişlerde çalış
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    
    -- Teklif sahibini ve bilgileri al
    SELECT creator_id, activity_name INTO proposal_owner, proposal_name
    FROM proposals
    WHERE id = NEW.proposal_id;
    
    -- İsimleri al
    SELECT name INTO requester_name FROM profiles WHERE id = NEW.requester_id;
    SELECT name INTO owner_name FROM profiles WHERE id = proposal_owner;
    
    -- Database'e bildirim gönder
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'request_accepted',
      'Başvurun Kabul Edildi! 🎉',
      owner_name || ' başvurunu kabul etti. Artık mesajlaşabilirsiniz!',
      jsonb_build_object(
        'request_id', NEW.id,
        'proposal_id', NEW.proposal_id,
        'accepter_id', proposal_owner
      )
    );

    -- Push notification gönder
    SELECT send_push_to_user(
      NEW.requester_id,
      'Başvurun Kabul Edildi! 🎉',
      owner_name || ' başvurunu kabul etti',
      'match',
      jsonb_build_object(
        'requestId', NEW.id,
        'proposalId', NEW.proposal_id,
        'matchId', proposal_owner
      )
    ) INTO push_success;
    
    -- Aynı teklife yapılan diğer bekleyen başvuruları reddet
    UPDATE proposal_requests
    SET status = 'auto_rejected',
        updated_at = NOW()
    WHERE proposal_id = NEW.proposal_id
      AND id != NEW.id
      AND status = 'pending';
    
    -- Teklifi 'matched' durumuna al
    UPDATE proposals
    SET status = 'matched',
        updated_at = NOW()
    WHERE id = NEW.proposal_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Yeni eşleşme oluştuğunda push notification gönder
CREATE OR REPLACE FUNCTION notify_new_match_with_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user1_name TEXT;
  user2_name TEXT;
  push_success1 BOOLEAN;
  push_success2 BOOLEAN;
BEGIN
  -- İsimleri al
  SELECT name INTO user1_name FROM profiles WHERE id = NEW.user1_id;
  SELECT name INTO user2_name FROM profiles WHERE id = NEW.user2_id;
  
  -- Database'e bildirimler oluştur
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES 
    (
      NEW.user1_id,
      'match',
      'Yeni Eşleşme! 🎉',
      user2_name || ' ile eşleştiniz! Artık mesajlaşabilirsiniz.',
      jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id)
    ),
    (
      NEW.user2_id,
      'match',
      'Yeni Eşleşme! 🎉',
      user1_name || ' ile eşleştiniz! Artık mesajlaşabilirsiniz.',
      jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id)
    );

  -- Push notifications gönder
  SELECT send_push_to_user(
    NEW.user1_id,
    'Yeni Eşleşme! 🎉',
    user2_name || ' ile eşleştiniz!',
    'match',
    jsonb_build_object('matchId', NEW.id, 'otherUserId', NEW.user2_id)
  ) INTO push_success1;

  SELECT send_push_to_user(
    NEW.user2_id,
    'Yeni Eşleşme! 🎉',
    user1_name || ' ile eşleştiniz!',
    'match',
    jsonb_build_object('matchId', NEW.id, 'otherUserId', NEW.user1_id)
  ) INTO push_success2;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eski trigger'ları kaldır ve yenilerini ekle
DROP TRIGGER IF EXISTS on_new_proposal_request ON proposal_requests;
CREATE TRIGGER on_new_proposal_request
AFTER INSERT ON proposal_requests
FOR EACH ROW
EXECUTE FUNCTION notify_new_request_with_push();

DROP TRIGGER IF EXISTS on_request_accepted ON proposal_requests;
CREATE TRIGGER on_request_accepted
AFTER UPDATE ON proposal_requests
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
EXECUTE FUNCTION handle_request_acceptance_with_push();

DROP TRIGGER IF EXISTS on_new_match ON matches;
CREATE TRIGGER on_new_match
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION notify_new_match_with_push();

-- Mesaj gönderildiğinde push notification gönder
CREATE OR REPLACE FUNCTION notify_new_message_with_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
  push_success BOOLEAN;
BEGIN
  -- Alıcıyı belirle (match'teki diğer kullanıcı)
  SELECT 
    CASE 
      WHEN m.user1_id = NEW.sender_id THEN m.user2_id
      ELSE m.user1_id
    END INTO receiver_id
  FROM matches m
  WHERE m.id = NEW.match_id;

  -- Gönderen kişinin adını al
  SELECT name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Push notification gönder
  SELECT send_push_to_user(
    receiver_id,
    sender_name || ' mesaj gönderdi 💬',
    NEW.content,
    'message',
    jsonb_build_object(
      'matchId', NEW.match_id,
      'messageId', NEW.id,
      'senderId', NEW.sender_id
    )
  ) INTO push_success;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mesaj trigger'ı ekle (eğer messages tablosu varsa)
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message_with_push();

COMMENT ON FUNCTION send_push_notification IS 'Expo Push Notification gönderir';
COMMENT ON FUNCTION send_push_to_user IS 'Kullanıcıya push notification gönderir';