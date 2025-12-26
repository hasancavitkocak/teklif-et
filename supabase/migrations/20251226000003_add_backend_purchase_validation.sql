-- Google Play Store backend doğrulama fonksiyonu

CREATE OR REPLACE FUNCTION validate_google_play_purchase(
  p_user_id UUID,
  p_package_id UUID,
  p_purchase_token TEXT,
  p_product_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_package packages%ROWTYPE;
  v_existing_purchase package_purchases%ROWTYPE;
  v_validation_result JSONB;
BEGIN
  -- Paket bilgilerini al
  SELECT * INTO v_package
  FROM packages
  WHERE id = p_package_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Paket bulunamadı veya aktif değil'
    );
  END IF;
  
  -- Aynı purchase token ile satın alma var mı kontrol et
  SELECT * INTO v_existing_purchase
  FROM package_purchases 
  WHERE purchase_token = p_purchase_token
  AND user_id = p_user_id;
  
  IF FOUND THEN
    -- Zaten var, başarılı olarak döndür
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Satın alma zaten doğrulanmış',
      'purchase_id', v_existing_purchase.id
    );
  END IF;
  
  -- Basit doğrulama kuralları (Google Play API olmadan)
  BEGIN
    -- Purchase token format kontrolü
    IF LENGTH(p_purchase_token) < 20 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Geçersiz purchase token formatı'
      );
    END IF;
    
    -- Product ID kontrolü
    IF p_product_id NOT IN ('premiumweekly', 'premiummonthly', 'premiumyearly', 'superlike5', 'superlike10', 'boost3') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Geçersiz product ID'
      );
    END IF;
    
    -- Timestamp kontrolü (son 24 saat içinde olmalı)
    -- Purchase token genelde timestamp içerir
    
    -- Şimdilik basit doğrulama - production'da Google Play API gerekli
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Basit doğrulama başarılı - Production''da Google Play API gerekli',
      'validation_method', 'basic_validation',
      'warning', 'Google Play API kurulumu önerilir'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Doğrulama hatası: ' || SQLERRM
      );
  END;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'a yetki ver
GRANT EXECUTE ON FUNCTION validate_google_play_purchase TO authenticated;

-- Comment ekle
COMMENT ON FUNCTION validate_google_play_purchase IS 'Google Play Store purchase token doğrulama - Basit doğrulama (Production için Google Play API önerilir)';