-- Google Play Store satın alma kaydetme fonksiyonu
CREATE OR REPLACE FUNCTION record_google_play_purchase(
  p_user_id UUID,
  p_package_id UUID,
  p_transaction_id TEXT,
  p_purchase_token TEXT,
  p_product_id TEXT
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
  
  -- Satın almayı kaydet
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
    store_receipt_data
  ) VALUES (
    p_user_id,
    p_package_id,
    v_package.type::purchase_type,
    'completed',
    v_package.price_amount,
    v_package.currency,
    'google_play',
    p_transaction_id,
    p_transaction_id,
    NOW(),
    v_expires_at,
    CASE WHEN v_package.type = 'subscription' THEN true ELSE false END,
    NOW(),
    NOW(),
    -- Google Play Store fields
    'android',
    p_product_id,
    p_purchase_token
  ) RETURNING id INTO v_purchase_id;
  
  -- Eğer addon ise kredileri ekle
  IF v_package.type = 'addon' AND v_package.credits_amount > 0 THEN
    INSERT INTO user_credits (
      user_id,
      credit_type,
      amount,
      source,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_package.category::credit_type,
      v_package.credits_amount,
      'purchase',
      NOW(),
      NOW()
    ) ON CONFLICT (user_id, credit_type) 
    DO UPDATE SET 
      amount = user_credits.amount + v_package.credits_amount,
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

-- Comment ekle
COMMENT ON FUNCTION record_google_play_purchase IS 'Google Play Store satın almasını kaydeder ve kullanıcı durumunu günceller';