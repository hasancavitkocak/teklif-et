-- record_google_play_purchase fonksiyonunu source kolonu ile uyumlu hale getir
-- Önce mevcut fonksiyonu sil
DROP FUNCTION IF EXISTS record_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT);

-- Güncellenmiş fonksiyonu oluştur
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
  v_is_consumable BOOLEAN := false;
BEGIN
  -- Paket bilgilerini al
  SELECT * INTO v_package
  FROM packages
  WHERE id = p_package_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paket bulunamadi veya aktif degil';
  END IF;
  
  -- Consumable ürün kontrolü (addon ve one_time ürünler consumable)
  v_is_consumable := (v_package.type = 'addon' AND v_package.duration_type = 'one_time');
  
  -- Sadece NON-CONSUMABLE ürünler için duplicate kontrol
  IF NOT v_is_consumable THEN
    IF EXISTS (
      SELECT 1 FROM package_purchases 
      WHERE transaction_id = p_transaction_id 
      OR platform_transaction_id = p_transaction_id
    ) THEN
      RAISE EXCEPTION 'Bu satin alma zaten kaydedilmis';
    END IF;
  ELSE
    -- Consumable ürünler için sadece aynı purchase_token kontrolü
    IF EXISTS (
      SELECT 1 FROM package_purchases 
      WHERE store_receipt_data = p_purchase_token
      AND created_at > NOW() - INTERVAL '1 hour' -- Son 1 saat içinde aynı token
    ) THEN
      RAISE EXCEPTION 'Bu satin alma zaten kaydedilmis (consumable duplicate)';
    END IF;
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
  
  -- Eğer addon ise kredileri ekle (source kolonu ile)
  IF v_package.type = 'addon' AND v_package.credits_amount > 0 THEN
    -- user_credits tablosunda source kolonu var mı kontrol et
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_credits' 
      AND column_name = 'source'
    ) THEN
      -- Source kolonu varsa kullan
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
    ELSE
      -- Source kolonu yoksa source olmadan ekle
      INSERT INTO user_credits (
        user_id,
        credit_type,
        amount,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        v_package.category::credit_type,
        v_package.credits_amount,
        NOW(),
        NOW()
      ) ON CONFLICT (user_id, credit_type) 
      DO UPDATE SET 
        amount = user_credits.amount + v_package.credits_amount,
        updated_at = NOW();
    END IF;
      
    -- Boost paketi ise otomatik olarak boost başlat
    IF v_package.category = 'boost' THEN
      DECLARE
        v_boost_result JSON;
      BEGIN
        -- Boost kredisi kullan (otomatik başlatma)
        SELECT use_boost_credit(p_user_id) INTO v_boost_result;
        
        IF (v_boost_result->>'success')::BOOLEAN THEN
          RAISE NOTICE 'Boost paketi satin alindi ve otomatik baslatildi: %', p_user_id;
        ELSE
          RAISE NOTICE 'Boost paketi satin alindi ama baslatilamadi: %', v_boost_result->>'error';
        END IF;
      END;
    END IF;
      
    -- Log ekle
    RAISE NOTICE 'Consumable urun kredisi eklendi: % % kredi', v_package.category, v_package.credits_amount;
  END IF;
  
  -- Eğer subscription ise kullanıcının premium durumunu güncelle
  IF v_package.type = 'subscription' THEN
    UPDATE profiles 
    SET 
      is_premium = true,
      premium_expires_at = v_expires_at,
      premium_transaction_id = p_transaction_id,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION record_google_play_purchase TO authenticated;

-- Comment güncelle
COMMENT ON FUNCTION record_google_play_purchase IS 'Google Play Store satin almasini kaydeder, source kolonu ile uyumlu, consumable urunler icin tekrar satin alma destegi';