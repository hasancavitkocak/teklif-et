-- Bildirim Sistemi ve Otomatik Reddetme
-- 1. Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'match', 'request_accepted', 'request_rejected', 'new_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger'lar için INSERT izni
CREATE POLICY "Allow trigger inserts"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Yeni başvuru geldiğinde bildirim oluştur
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_owner UUID;
  requester_name TEXT;
  proposal_name TEXT;
BEGIN
  -- Teklif sahibini ve bilgileri al
  SELECT creator_id, activity_name INTO proposal_owner, proposal_name
  FROM proposals
  WHERE id = NEW.proposal_id;
  
  -- Başvuran kişinin adını al
  SELECT name INTO requester_name
  FROM profiles
  WHERE id = NEW.requester_id;
  
  -- Bildirim oluştur
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_proposal_request ON proposal_requests;
CREATE TRIGGER on_new_proposal_request
AFTER INSERT ON proposal_requests
FOR EACH ROW
EXECUTE FUNCTION notify_new_request();

-- 3. Başvuru kabul edildiğinde bildirim oluştur ve diğerlerini reddet
CREATE OR REPLACE FUNCTION handle_request_acceptance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_owner UUID;
  requester_name TEXT;
  owner_name TEXT;
  proposal_name TEXT;
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
    
    -- Başvuran kişiye bildirim gönder
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

DROP TRIGGER IF EXISTS on_request_accepted ON proposal_requests;
CREATE TRIGGER on_request_accepted
AFTER UPDATE ON proposal_requests
FOR EACH ROW
WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
EXECUTE FUNCTION handle_request_acceptance();

-- 4. Başvuru reddedildiğinde bildirim oluştur (opsiyonel)
CREATE OR REPLACE FUNCTION handle_request_rejection()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_name TEXT;
  proposal_name TEXT;
BEGIN
  -- Sadece manuel reddetmelerde bildirim gönder (auto_rejected değil)
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    
    -- Teklif sahibinin adını ve teklif adını al
    SELECT p.activity_name, prof.name INTO proposal_name, owner_name
    FROM proposals p
    JOIN profiles prof ON prof.id = p.creator_id
    WHERE p.id = NEW.proposal_id;
    
    -- Başvuran kişiye bildirim gönder (opsiyonel - kullanıcı deneyimi için kapatılabilir)
    -- INSERT INTO notifications (user_id, type, title, message, data)
    -- VALUES (
    --   NEW.requester_id,
    --   'request_rejected',
    --   'Başvuru Reddedildi',
    --   '"' || proposal_name || '" başvurunuz reddedildi',
    --   jsonb_build_object('request_id', NEW.id, 'proposal_id', NEW.proposal_id)
    -- );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_request_rejected ON proposal_requests;
CREATE TRIGGER on_request_rejected
AFTER UPDATE ON proposal_requests
FOR EACH ROW
WHEN (NEW.status = 'rejected' AND OLD.status = 'pending')
EXECUTE FUNCTION handle_request_rejection();

-- 5. Match oluştuğunda bildirim oluştur
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user1_name TEXT;
  user2_name TEXT;
BEGIN
  -- İsimleri al
  SELECT name INTO user1_name FROM profiles WHERE id = NEW.user1_id;
  SELECT name INTO user2_name FROM profiles WHERE id = NEW.user2_id;
  
  -- Her iki kullanıcıya da bildirim gönder
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_match ON matches;
CREATE TRIGGER on_new_match
AFTER INSERT ON matches
FOR EACH ROW
EXECUTE FUNCTION notify_new_match();

-- 6. Reddedilen ve otomatik reddedilen başvuruları temizleme (opsiyonel - 30 gün sonra)
CREATE OR REPLACE FUNCTION cleanup_old_rejected_requests()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM proposal_requests
  WHERE status IN ('rejected', 'auto_rejected')
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Temizleme fonksiyonunu manuel çağırabilirsiniz veya cron job ekleyebilirsiniz
-- SELECT cleanup_old_rejected_requests();

COMMENT ON TABLE notifications IS 'Kullanıcı bildirimleri - başvuru, kabul, red, eşleşme';
COMMENT ON COLUMN notifications.type IS 'Bildirim tipi: match, request_accepted, request_rejected, new_request';
COMMENT ON COLUMN notifications.data IS 'Bildirimle ilgili ek veriler (JSON)';
