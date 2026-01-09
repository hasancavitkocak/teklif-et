-- Premium tarih hesaplamasi duzeltmesi - purchaseTime kullan

-- Onceki tum record_google_play_purchase fonksiyonlarini sil
DROP FUNCTION IF EXISTS record_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS record_google_play_purchase(UUID, UUID, TEXT, TEXT, TEXT, BIGINT);

-- Tum record_google_play_purchase fonksiyonlarini sil (son care)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT proname, oidvectortypes(proargtypes) as argtypes 
             FROM pg_proc 
             WHERE proname = 'record_google_play_purchase'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.proname || '(' || r.argtypes || ')';
    END LOOP;
END $$;

-- Yeni fonksiyonu olustur
CREATE OR REPLACE FUNCTION record_google_play_purchase(
  p_user_id UUID,
  p_package_id UUID,
  p_transaction_id TEXT,
  p_purchase_token TEXT,
  p_product_id TEXT,
  p_purchase_time_ms BIGINT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_purchase_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_purchase_date TIMESTAMP WITH TIME ZONE;
  v_is_consumable BOOLEAN := false;
  v_is_subscription BOOLEAN := false;
  v_existing_purchase package_purchases%ROWTYPE;
  v_existing_premium_user profiles%ROWTYPE;
BEGIN
  -- Paket bilgilerini al
  SELECT * INTO v_package
  FROM packages
  WHERE id = p_package_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paket bulunamadi veya aktif degil';
  END IF;
  
  -- Purchase time'i timestamp'e cevir
  IF p_purchase_time_ms IS NOT NULL AND p_purchase_time_ms > 0 THEN
    v_purchase_date := to_timestamp(p_purchase_time_ms / 1000.0);
    RAISE NOTICE 'Purchase time kullaniliyor: % (timestamp: %)', p_purchase_time_ms, v_purchase_date;
  ELSE
    v_purchase_date := NOW();
    RAISE NOTICE 'Purchase time yok, NOW() kullaniliyor: %', v_purchase_date;
  END IF;
  
  -- Urun tiplerini belirle
  v_is_consumable := (v_package.type = 'addon' AND v_package.duration_type = 'one_time');
  v_is_subscription := (p_product_id IN ('premiumweekly', 'premiummonthly', 'premiumyearly'));
  
  -- OZEL DURUM: Subscription restore islemi icin premium kontrol
  IF v_is_subscription THEN
    -- Ayni transaction ID ile baska kullanicinin premium oldugu durumu kontrol et
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
      
      RAISE NOTICE 'Restore sirasinda onceki premium kullanici pasif edildi: %', v_existing_premium_user.id;
    END IF;
    
    -- Ayni transaction ID ile mevcut kullanicinin kaydi var mi kontrol et
    SELECT * INTO v_existing_purchase
    FROM package_purchases 
    WHERE (transaction_id = p_transaction_id OR platform_transaction_id = p_transaction_id)
      AND user_id = p_user_id;
    
    -- Eger mevcut kullanicinin kaydi varsa, sadece premium durumunu guncelle
    IF FOUND THEN
      -- Premium bitis tarihini purchase time'dan hesapla
      IF p_product_id = 'premiumweekly' THEN
        v_expires_at := v_purchase_date + INTERVAL '1 week';
      ELSIF p_product_id = 'premiumyearly' THEN
        v_expires_at := v_purchase_date + INTERVAL '1 year';
      ELSE
        v_expires_at := v_purchase_date + INTERVAL '1 month';
      END IF;
      
      -- Premium durumunu aktif et
      UPDATE profiles 
      SET 
        is_premium = true,
        premium_expires_at = v_expires_at,
        premium_transaction_id = p_transaction_id,
        updated_at = NOW()
      WHERE id = p_user_id;
      
      RAISE NOTICE 'Mevcut kullanici icin premium durumu guncellendi: %, expires_at: %', p_user_id, v_expires_at;
      RETURN v_existing_purchase.id;
    END IF;
    
    -- Baska kullanicinin kaydi varsa sil (coklu kullanim engelleme)
    DELETE FROM package_purchases 
    WHERE (transaction_id = p_transaction_id OR platform_transaction_id = p_transaction_id)
      AND user_id != p_user_id;
      
  ELSE
    -- NON-SUBSCRIPTION urunler icin normal duplicate kontrol
    IF NOT v_is_consumable THEN
      IF EXISTS (
        SELECT 1 FROM package_purchases 
        WHERE (transaction_id = p_transaction_id OR platform_transaction_id = p_transaction_id)
          AND user_id = p_user_id
      ) THEN
        RAISE EXCEPTION 'Bu satin alma zaten kaydedilmis';
      END IF;
    ELSE
      -- Consumable urunler icin purchase_token kontrol (ayni kullanici icin)
      IF EXISTS (
        SELECT 1 FROM package_purchases 
        WHERE store_receipt_data = p_purchase_token
          AND user_id = p_user_id
          AND created_at > NOW() - INTERVAL '1 hour'
      ) THEN
        RAISE EXCEPTION 'Bu satin alma zaten kaydedilmis (consumable duplicate)';
      END IF;
    END IF;
  END IF;
  
  -- Bitis tarihini purchase time'dan hesapla
  IF v_package.duration_type = 'weekly' THEN
    v_expires_at := v_purchase_date + INTERVAL '7 days';
  ELSIF v_package.duration_type = 'monthly' THEN
    v_expires_at := v_purchase_date + INTERVAL '1 month';
  ELSIF v_package.duration_type = 'yearly' THEN
    v_expires_at := v_purchase_date + INTERVAL '1 year';
  ELSE
    v_expires_at := NULL; -- one_time icin
  END IF;
  
  -- Satin almayi kaydet
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
    v_purchase_date,  -- Purchase time kullan
    v_expires_at,
    CASE WHEN v_package.type = 'subscription' THEN true ELSE false END,
    NOW(),
    NOW(),
    'android',
    p_product_id,
    p_purchase_token
  ) RETURNING id INTO v_purchase_id;
  
  -- Eger addon ise kredileri ekle
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
      
    RAISE NOTICE 'Consumable urun kredisi eklendi: % % kredi', v_package.category, v_package.credits_amount;
  END IF;
  
  -- Eger subscription ise kullanicinin premium durumunu guncelle
  IF v_package.type = 'subscription' THEN
    UPDATE profiles 
    SET 
      is_premium = true,
      premium_expires_at = v_expires_at,
      premium_transaction_id = p_transaction_id,
      updated_at = NOW()
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Premium durumu guncellendi: user_id=%, expires_at=%', p_user_id, v_expires_at;
  END IF;
  
  -- BOOST OTOMATIK BASLATMA - Transaction sonunda yap
  IF v_package.type = 'addon' AND v_package.category = 'boost' AND v_package.credits_amount > 0 THEN
    DECLARE
      v_boost_result JSON;
    BEGIN
      -- Boost kredisi kullan (otomatik baslatma)
      SELECT use_boost_credit(p_user_id) INTO v_boost_result;
      
      IF (v_boost_result->>'success')::BOOLEAN THEN
        RAISE NOTICE 'Boost paketi satin alindi ve otomatik baslatildi: %', p_user_id;
      ELSE
        RAISE NOTICE 'Boost paketi satin alindi ama baslatilamadi: %', v_boost_result->>'error';
      END IF;
    END;
  END IF;
  
  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION record_google_play_purchase TO authenticated;

-- Comment guncelle
COMMENT ON FUNCTION record_google_play_purchase IS 'Google Play Store satin almasini kaydeder, purchaseTime kullanarak dogru premium tarihleri hesaplar';