-- Boost oturumları tablosu
CREATE TABLE IF NOT EXISTS boost_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_boost_sessions_user_id ON boost_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_sessions_active ON boost_sessions(user_id, is_active, expires_at);

-- RLS politikaları
ALTER TABLE boost_sessions ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları sil ve yeniden oluştur
DROP POLICY IF EXISTS "Users can view their own boost sessions" ON boost_sessions;
DROP POLICY IF EXISTS "Users can insert their own boost sessions" ON boost_sessions;
DROP POLICY IF EXISTS "Users can update their own boost sessions" ON boost_sessions;

CREATE POLICY "Users can view their own boost sessions" ON boost_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boost sessions" ON boost_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boost sessions" ON boost_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Boost kullanma fonksiyonu
CREATE OR REPLACE FUNCTION use_boost_credit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_credit INTEGER;
  v_active_boost_count INTEGER;
  v_boost_session_id UUID;
BEGIN
  -- Mevcut boost kredisini kontrol et
  SELECT amount INTO v_current_credit
  FROM user_credits
  WHERE user_id = p_user_id AND credit_type = 'boost';
  
  IF v_current_credit IS NULL OR v_current_credit <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yetersiz boost kredisi'
    );
  END IF;
  
  -- Aktif boost oturumu var mı kontrol et
  SELECT COUNT(*) INTO v_active_boost_count
  FROM boost_sessions
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND expires_at > NOW();
  
  IF v_active_boost_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Zaten aktif bir boost oturumunuz var'
    );
  END IF;
  
  -- Krediyi azalt
  UPDATE user_credits
  SET 
    amount = amount - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id AND credit_type = 'boost';
  
  -- Yeni boost oturumu başlat
  INSERT INTO boost_sessions (user_id, started_at, expires_at)
  VALUES (p_user_id, NOW(), NOW() + INTERVAL '30 minutes')
  RETURNING id INTO v_boost_session_id;
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_boost_session_id,
    'expires_at', (NOW() + INTERVAL '30 minutes')::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Boost cooldown durumunu kontrol et
CREATE OR REPLACE FUNCTION get_boost_cooldown_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_last_boost_time TIMESTAMP WITH TIME ZONE;
  v_cooldown_seconds INTEGER;
BEGIN
  -- Son boost oturumunun bitim zamanını kontrol et
  SELECT expires_at INTO v_last_boost_time
  FROM boost_sessions
  WHERE user_id = p_user_id 
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Eğer son boost 30 dakika içinde bittiyse, cooldown var
  IF v_last_boost_time IS NOT NULL AND v_last_boost_time > (NOW() - INTERVAL '30 minutes') THEN
    v_cooldown_seconds := EXTRACT(EPOCH FROM (v_last_boost_time + INTERVAL '30 minutes' - NOW()))::INTEGER;
    
    RETURN json_build_object(
      'has_cooldown', true,
      'cooldown_seconds', v_cooldown_seconds,
      'can_use_boost', false
    );
  END IF;
  
  RETURN json_build_object(
    'has_cooldown', false,
    'cooldown_seconds', 0,
    'can_use_boost', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aktif boost oturumunu getir fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION get_active_boost_session(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_session boost_sessions%ROWTYPE;
BEGIN
  -- Aktif boost oturumunu bul
  SELECT * INTO v_session
  FROM boost_sessions
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND expires_at > NOW()
  ORDER BY started_at DESC
  LIMIT 1;
  
  IF v_session.id IS NULL THEN
    RETURN json_build_object(
      'active', false
    );
  END IF;
  
  RETURN json_build_object(
    'active', true,
    'session_id', v_session.id,
    'started_at', v_session.started_at::text,
    'expires_at', v_session.expires_at::text,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_session.expires_at - NOW()))::INTEGER
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının aktif boost oturumuna göre tekliflerini güncelle
CREATE OR REPLACE FUNCTION update_user_proposals_boost_status(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_active_boost BOOLEAN := false;
BEGIN
  -- Aktif boost oturumu var mı kontrol et
  SELECT EXISTS(
    SELECT 1 FROM boost_sessions
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND expires_at > NOW()
  ) INTO v_has_active_boost;
  
  -- Kullanıcının tüm aktif tekliflerini güncelle
  UPDATE proposals
  SET 
    is_boosted = v_has_active_boost,
    updated_at = NOW()
  WHERE creator_id = p_user_id 
    AND status = 'active';
    
  -- Log
  RAISE NOTICE 'Kullanıcı % için % teklif boost durumu güncellendi: %', 
    p_user_id, 
    (SELECT COUNT(*) FROM proposals WHERE creator_id = p_user_id AND status = 'active'),
    v_has_active_boost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Boost kredisi kullanma fonksiyonunu güncelle - otomatik başlatma ve cooldown
CREATE OR REPLACE FUNCTION use_boost_credit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_credit INTEGER;
  v_last_boost_time TIMESTAMP WITH TIME ZONE;
  v_boost_session_id UUID;
BEGIN
  -- Mevcut boost kredisini kontrol et
  SELECT amount INTO v_current_credit
  FROM user_credits
  WHERE user_id = p_user_id AND credit_type = 'boost';
  
  IF v_current_credit IS NULL OR v_current_credit <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yetersiz boost kredisi'
    );
  END IF;
  
  -- Son boost oturumunun bitim zamanını kontrol et (30 dakika cooldown)
  SELECT expires_at INTO v_last_boost_time
  FROM boost_sessions
  WHERE user_id = p_user_id 
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Eğer son boost 30 dakika içinde bittiyse, cooldown var
  IF v_last_boost_time IS NOT NULL AND v_last_boost_time > (NOW() - INTERVAL '30 minutes') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Boost kullanmak için ' || 
        EXTRACT(EPOCH FROM (v_last_boost_time + INTERVAL '30 minutes' - NOW()))::INTEGER || 
        ' saniye beklemelisiniz',
      'cooldown_seconds', EXTRACT(EPOCH FROM (v_last_boost_time + INTERVAL '30 minutes' - NOW()))::INTEGER
    );
  END IF;
  
  -- Aktif boost oturumu var mı kontrol et
  IF EXISTS (
    SELECT 1 FROM boost_sessions
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND expires_at > NOW()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Zaten aktif bir boost oturumunuz var'
    );
  END IF;
  
  -- Krediyi azalt
  UPDATE user_credits
  SET 
    amount = amount - 1,
    updated_at = NOW()
  WHERE user_id = p_user_id AND credit_type = 'boost';
  
  -- Yeni boost oturumu başlat
  INSERT INTO boost_sessions (user_id, started_at, expires_at)
  VALUES (p_user_id, NOW(), NOW() + INTERVAL '30 minutes')
  RETURNING id INTO v_boost_session_id;
  
  -- Kullanıcının tekliflerini boost'lu yap
  PERFORM update_user_proposals_boost_status(p_user_id);
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_boost_session_id,
    'expires_at', (NOW() + INTERVAL '30 minutes')::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Süresi dolan boost oturumlarını deaktif et ve teklifleri güncelle
CREATE OR REPLACE FUNCTION deactivate_expired_boost_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
  v_user_record RECORD;
BEGIN
  -- Süresi dolan oturumları bul ve deaktif et
  UPDATE boost_sessions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE is_active = true 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Etkilenen kullanıcıların tekliflerini güncelle
  FOR v_user_record IN 
    SELECT DISTINCT user_id 
    FROM boost_sessions 
    WHERE is_active = false 
      AND expires_at <= NOW() 
      AND updated_at >= NOW() - INTERVAL '1 minute'
  LOOP
    PERFORM update_user_proposals_boost_status(v_user_record.user_id);
  END LOOP;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonksiyonlara yetki ver
GRANT EXECUTE ON FUNCTION use_boost_credit TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_boost_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_boost_cooldown_status TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_expired_boost_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_proposals_boost_status TO authenticated;

-- Yorumlar
COMMENT ON TABLE boost_sessions IS 'Kullanıcıların aktif boost oturumlarını takip eder';
COMMENT ON FUNCTION use_boost_credit IS 'Boost kredisi kullanır ve 30 dakikalık oturum başlatır';
COMMENT ON FUNCTION get_active_boost_session IS 'Kullanıcının aktif boost oturumunu getirir';
COMMENT ON FUNCTION deactivate_expired_boost_sessions IS 'Süresi dolan boost oturumlarını deaktif eder';