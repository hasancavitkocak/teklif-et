-- Google Play Store satın alma fonksiyonunu yeni alanlarla güncelle

-- Önce eski fonksiyonu sil
DROP FUNCTION IF EXISTS record_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT);

-- Yeni fonksiyonu oluştur
CREATE OR REPLACE FUNCTION record_google_play_purchase(
  p_user_id UUID,
  p_package_id UUID,
  p_transaction_id TEXT,
  p_purchase_token TEXT,
  p_product_id TEXT,
  p_purchase_time BIGINT DEFAULT NULL,
  p_purchase_state INTEGER DEFAULT NULL,
  p_acknowledged BOOLEAN DEFAULT false,
  p_auto_renewing BOOLEAN DEFAULT NULL,
  p_order_id TEXT DEFAULT NULL,
  p_package_name TEXT DEFAULT NULL,
  p_signature TEXT DEFAULT NULL,
  p_original_json TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_purchase_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Paket bilgilerini al
  SELECT * INTO v_package
  FROM packages
  WHERE id = p_package_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paket bulunamadı veya aktif değil';
  END IF;
  
  -- Aynı transaction ID ile satın alma var mı kontrol et
  IF EXISTS (
    SELECT 1 FROM package_purchases 
    WHERE transaction_id = p_transaction_id 
    OR platform_transaction_id = p_transaction_id
    OR purchase_token = p_purchase_token
  ) THEN
    RAISE EXCEPTION 'Bu satın alma zaten kaydedilmiş';
  END IF;
  
  -- Bitiş tarihini hesapla
  IF v_package.duration_type = 'weekly' THEN
    v_expires_at := NOW() + INTERVAL '7 days';
  ELSIF v_package.duration_type = 'monthly' THEN
    v_expires_at := NOW() + INTERVAL '1 month';
  ELSIF v_package.duration_type = 'yearly' THEN
    v_expires_at := NOW() + INTERVAL '1 year';
  ELSE
    v_expires_at := NULL; -- one_time için
  END IF;
  
  -- Satın almayı tüm Google Play detaylarıyla kaydet
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
    created_at,
    updated_at,
    -- Google Play Store specific fields
    store_platform,
    store_product_id,
    store_receipt_data,
    purchase_time,
    purchase_state,
    acknowledged,
    auto_renewing_store,
    store_order_id,
    package_name,
    store_signature,
    original_json,
    purchase_token
  ) VALUES (
    p_user_id,
    p_package_id,
    v_package.type,
    'completed',
    v_package.price_amount,
    v_package.currency,
    'google_play',
    p_transaction_id,
    p_transaction_id,
    NOW(),
    v_expires_at,
    COALESCE(p_auto_renewing, CASE WHEN v_package.type = 'subscription' THEN true ELSE false END),
    NOW(),
    NOW(),
    -- Google Play Store fields
    'android',
    p_product_id,
    p_purchase_token,
    p_purchase_time,
    p_purchase_state,
    p_acknowledged,
    p_auto_renewing,
    p_order_id,
    p_package_name,
    p_signature,
    p_original_json,
    p_purchase_token
  ) RETURNING id INTO v_purchase_id;
  
  -- Eğer addon ise kredileri ekle
  IF v_package.type = 'addon' AND v_package.credits_amount > 0 THEN
    INSERT INTO user_credits (
      user_id,
      credit_type,
      amount,
      expires_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_package.category,
      v_package.credits_amount,
      v_expires_at,
      NOW(),
      NOW()
    ) ON CONFLICT (user_id, credit_type) 
    DO UPDATE SET 
      amount = user_credits.amount + v_package.credits_amount,
      expires_at = CASE 
        WHEN v_expires_at IS NULL THEN user_credits.expires_at
        WHEN user_credits.expires_at IS NULL THEN v_expires_at
        ELSE GREATEST(user_credits.expires_at, v_expires_at)
      END,
      updated_at = NOW();
  END IF;
  
  -- Eğer subscription ise kullanıcının premium durumunu güncelle
  IF v_package.type = 'subscription' THEN
    UPDATE profiles 
    SET 
      is_premium = true,
      premium_expires_at = v_expires_at,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION record_google_play_purchase TO authenticated;

-- Comment güncelle
COMMENT ON FUNCTION record_google_play_purchase IS 'Google Play Store satın almasını tüm detaylarıyla kaydeder ve kullanıcı durumunu günceller';