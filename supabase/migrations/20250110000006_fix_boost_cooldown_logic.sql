-- Boost cooldown mantigi duzeltmesi
CREATE OR REPLACE FUNCTION use_boost_credit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_current_credit INTEGER;
  v_last_boost_end_time TIMESTAMP WITH TIME ZONE;
  v_boost_session_id UUID;
  v_active_boost_count INTEGER;
BEGIN
  -- Mevcut boost kredisini kontrol et
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
  
  -- Aktif boost oturumu var mi kontrol et (ONCE BU KONTROL)
  SELECT COUNT(*) INTO v_active_boost_count
  FROM boost_sessions
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND expires_at > NOW();
  
  IF v_active_boost_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Zaten aktif bir boost oturumunuz var',
      'active_sessions', v_active_boost_count
    );
  END IF;
  
  -- Son BITMIS boost oturumunun bitim zamanini kontrol et (30 dakika cooldown)
  SELECT expires_at INTO v_last_boost_end_time
  FROM boost_sessions
  WHERE user_id = p_user_id 
    AND is_active = false  -- Sadece bitmis oturumlar
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Eger son boost bittikten sonra 30 dakika gecmemisse, cooldown var
  IF v_last_boost_end_time IS NOT NULL 
     AND (v_last_boost_end_time + INTERVAL '30 minutes') > NOW() THEN
    
    DECLARE
      v_remaining_cooldown INTEGER;
    BEGIN
      v_remaining_cooldown := EXTRACT(EPOCH FROM (v_last_boost_end_time + INTERVAL '30 minutes' - NOW()))::INTEGER;
      
      RETURN json_build_object(
        'success', false,
        'error', 'Boost kullanmak icin ' || v_remaining_cooldown || ' saniye beklemelisiniz',
        'cooldown_seconds', v_remaining_cooldown,
        'last_boost_ended_at', v_last_boost_end_time::text
      );
    END;
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
  INSERT INTO boost_sessions (user_id, started_at, expires_at, is_active)
  VALUES (p_user_id, NOW(), NOW() + INTERVAL '30 minutes', true)
  RETURNING id INTO v_boost_session_id;
  
  -- Kullanicinin tekliflerini boost'lu yap
  PERFORM update_user_proposals_boost_status(p_user_id);
  
  RAISE NOTICE 'Boost oturumu baslatildi: session_id=%, user_id=%, expires_at=%', 
    v_boost_session_id, p_user_id, (NOW() + INTERVAL '30 minutes')::text;
  
  RETURN json_build_object(
    'success', true,
    'session_id', v_boost_session_id,
    'expires_at', (NOW() + INTERVAL '30 minutes')::text,
    'remaining_seconds', 1800,
    'message', 'Boost oturumu baslatildi'
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

-- Boost oturumlarini otomatik deaktif etme fonksiyonunu da guncelle
CREATE OR REPLACE FUNCTION deactivate_expired_boost_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deactivated_count INTEGER;
BEGIN
  -- Suresi dolan aktif boost oturumlarini deaktif et
  UPDATE boost_sessions
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE is_active = true 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
  
  RAISE NOTICE 'Deaktif edilen boost oturum sayisi: %', v_deactivated_count;
  
  RETURN v_deactivated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'lara yetki ver
GRANT EXECUTE ON FUNCTION use_boost_credit TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_expired_boost_sessions TO authenticated;

-- Comment'leri guncelle
COMMENT ON FUNCTION use_boost_credit IS 'Boost kredisi kullanir, duzeltilmis cooldown mantigi ile';
COMMENT ON FUNCTION deactivate_expired_boost_sessions IS 'Suresi dolan boost oturumlarini deaktif eder';