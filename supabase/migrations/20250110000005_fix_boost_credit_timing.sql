-- use_boost_credit fonksiyonunu guncelle - ayni transaction icindeki kredileri gorsun
CREATE OR REPLACE FUNCTION use_boost_credit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_credit INTEGER;
  v_last_boost_time TIMESTAMP WITH TIME ZONE;
  v_boost_session_id UUID;
BEGIN
  -- Mevcut boost kredisini kontrol et (READ COMMITTED ile)
  SELECT amount INTO v_current_credit
  FROM user_credits
  WHERE user_id = p_user_id AND credit_type = 'boost';
  
  -- Eger kredi bulunamazsa 0 olarak varsay
  IF v_current_credit IS NULL THEN
    v_current_credit := 0;
  END IF;
  
  RAISE NOTICE 'Boost kredi kontrolu: user_id=%, mevcut_kredi=%', p_user_id, v_current_credit;
  
  IF v_current_credit <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Yetersiz boost kredisi',
      'current_credit', v_current_credit
    );
  END IF;
  
  -- Son boost oturumunun bitim zamanini kontrol et (30 dakika cooldown)
  SELECT expires_at INTO v_last_boost_time
  FROM boost_sessions
  WHERE user_id = p_user_id 
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Eger son boost 30 dakika icinde bittiyse, cooldown var
  IF v_last_boost_time IS NOT NULL AND v_last_boost_time > (NOW() - INTERVAL '30 minutes') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Boost kullanmak icin ' || 
        EXTRACT(EPOCH FROM (v_last_boost_time + INTERVAL '30 minutes' - NOW()))::INTEGER || 
        ' saniye beklemelisiniz',
      'cooldown_seconds', EXTRACT(EPOCH FROM (v_last_boost_time + INTERVAL '30 minutes' - NOW()))::INTEGER
    );
  END IF;
  
  -- Aktif boost oturumu var mi kontrol et
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
  
  -- Guncelleme basarili mi kontrol et
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kredi guncellenemedi'
    );
  END IF;
  
  -- Yeni boost oturumu baslat
  INSERT INTO boost_sessions (user_id, started_at, expires_at)
  VALUES (p_user_id, NOW(), NOW() + INTERVAL '30 minutes')
  RETURNING id INTO v_boost_session_id;
  
  -- Kullanicinin tekliflerini boost'lu yap
  PERFORM update_user_proposals_boost_status(p_user_id);
  
  RAISE NOTICE 'Boost oturumu baslatildi: session_id=%, user_id=%', v_boost_session_id, p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_boost_session_id,
    'expires_at', (NOW() + INTERVAL '30 minutes')::text,
    'remaining_seconds', 1800
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Boost kredi kullanim hatasi: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Boost baslatma hatasi: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION use_boost_credit TO authenticated;

-- Comment guncelle
COMMENT ON FUNCTION use_boost_credit IS 'Boost kredisi kullanir ve 30 dakikalik oturum baslatir - gelismis hata yonetimi ile';