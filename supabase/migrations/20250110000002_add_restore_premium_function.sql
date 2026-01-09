-- Restore purchases sirasinda premium kontrolu yapan fonksiyon
CREATE OR REPLACE FUNCTION restore_premium_with_transaction_check(
  p_user_id UUID,
  p_transaction_id TEXT,
  p_product_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_current_user profiles%ROWTYPE;
  v_existing_premium_user profiles%ROWTYPE;
  v_is_subscription BOOLEAN := false;
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
  
  -- Product ID'den abonelik mi kontrol et (sadece abonelikler icin islem yap)
  v_is_subscription := (p_product_id IN ('premiumweekly', 'premiummonthly', 'premiumyearly'));
  
  -- Eger abonelik degilse (addon/consumable), normal restore islemi yap
  IF NOT v_is_subscription THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Addon urun - premium kontrol gerekmiyor',
      'is_subscription', false,
      'action', 'proceed_normal_restore'
    );
  END IF;
  
  -- Google Play Store simulasyonu - production'da gercek API cagrisi yapilacak
  -- Simdilik basit validation
  IF LENGTH(p_transaction_id) < 20 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gecersiz transaction ID formati'
    );
  END IF;
  
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
    
    RAISE NOTICE 'Restore sirasinda onceki premium kullanici pasif edildi: %', v_existing_premium_user.id;
  END IF;
  
  -- Mevcut kullanicinin premium durumunu aktif et
  UPDATE profiles 
  SET 
    is_premium = true,
    premium_expires_at = CASE 
      WHEN p_product_id = 'premiumweekly' THEN NOW() + INTERVAL '1 week'
      WHEN p_product_id = 'premiumyearly' THEN NOW() + INTERVAL '1 year'
      ELSE NOW() + INTERVAL '1 month'
    END,
    premium_transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Premium durumu restore edildi',
    'user_id', p_user_id,
    'transaction_id', p_transaction_id,
    'product_id', p_product_id,
    'previous_premium_user_deactivated', FOUND,
    'is_subscription', true,
    'action', 'premium_restored'
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
GRANT EXECUTE ON FUNCTION restore_premium_with_transaction_check TO authenticated;

-- Comment ekle
COMMENT ON FUNCTION restore_premium_with_transaction_check IS 'Restore purchases sirasinda premium abonelik kontrolu yapar ve coklu kullanim engeller';