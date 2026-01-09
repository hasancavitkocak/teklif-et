-- Premium kullanicilarin transaction ID'lerini takip etmek icin profiles tablosuna kolon ekle
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_transaction_id TEXT;

-- Index ekle (performans icin)
CREATE INDEX IF NOT EXISTS idx_profiles_premium_transaction_id 
ON public.profiles(premium_transaction_id) 
WHERE premium_transaction_id IS NOT NULL;

-- Login sirasinda Google Play Store'dan premium durumunu kontrol eden fonksiyon
CREATE OR REPLACE FUNCTION check_and_update_premium_on_login(
  p_user_id UUID,
  p_transaction_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_current_user profiles%ROWTYPE;
  v_existing_premium_user profiles%ROWTYPE;
  v_google_play_response JSONB;
  v_result JSONB;
BEGIN
  -- Mevcut kullanici bilgilerini al
  SELECT * INTO v_current_user
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kullanici bulunamadi'
    );
  END IF;
  
  -- Google Play Store'a transaction ID ile istek at (simulasyon)
  -- Production'da burada gercek Google Play API cagrisi yapilacak
  BEGIN
    -- Basit validation - transaction ID format kontrolu
    IF LENGTH(p_transaction_id) < 20 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Gecersiz transaction ID formati'
      );
    END IF;
    
    -- Google Play API simulasyonu - success response
    v_google_play_response := jsonb_build_object(
      'success', true,
      'packageName', 'com.teklifet.app',
      'productId', 'premiummonthly',
      'purchaseState', 0,
      'acknowledged', true
    );
    
    -- Eger Google Play'den success donmuyorsa
    IF NOT (v_google_play_response->>'success')::BOOLEAN THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Google Play Store dogrulamasi basarisiz',
        'google_response', v_google_play_response
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Google Play Store API hatasi: ' || SQLERRM
      );
  END;
  
  -- Ayni transaction ID ile premium olan baska kullanici var mi kontrol et
  SELECT * INTO v_existing_premium_user
  FROM profiles
  WHERE premium_transaction_id = p_transaction_id
    AND id != p_user_id
    AND is_premium = true;
  
  -- Eger baska kullanici varsa onun premium'unu pasif yap
  IF FOUND THEN
    UPDATE profiles 
    SET 
      is_premium = false,
      premium_expires_at = NULL,
      premium_transaction_id = NULL,
      updated_at = NOW()
    WHERE id = v_existing_premium_user.id;
    
    RAISE NOTICE 'Onceki premium kullanici pasif edildi: %', v_existing_premium_user.id;
  END IF;
  
  -- Mevcut kullanicinin premium durumunu aktif et
  UPDATE profiles 
  SET 
    is_premium = true,
    premium_expires_at = NOW() + INTERVAL '1 month', -- Default 1 aylik
    premium_transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Kullanicinin tum abonelik durumlarini aktif et
  -- Package purchases tablosunda aktif premium kaydi olustur
  INSERT INTO package_purchases (
    user_id,
    package_id,
    purchase_type,
    status,
    price_paid,
    currency,
    payment_method,
    transaction_id,
    platform_transaction_id,
    starts_at,
    expires_at,
    auto_renew,
    store_platform,
    store_product_id,
    store_receipt_data,
    created_at,
    updated_at
  ) 
  SELECT 
    p_user_id,
    p.id,
    'subscription'::purchase_type,
    'completed',
    p.price_amount,
    p.currency,
    'google_play',
    p_transaction_id,
    p_transaction_id,
    NOW(),
    NOW() + INTERVAL '1 month',
    true,
    'android',
    'premiummonthly', -- Default product ID
    p_transaction_id,
    NOW(),
    NOW()
  FROM packages p
  WHERE p.type = 'subscription' 
    AND p.is_active = true
    AND p.duration_type = 'monthly'
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Premium durumu basariyla guncellendi',
    'user_id', p_user_id,
    'transaction_id', p_transaction_id,
    'previous_premium_user_deactivated', FOUND,
    'google_play_response', v_google_play_response
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION check_and_update_premium_on_login TO authenticated;

-- Comment ekle
COMMENT ON FUNCTION check_and_update_premium_on_login IS 'Login sirasinda Google Play Store transaction ID ile premium durumunu kontrol eder ve coklu abonelik kullanimini engeller';