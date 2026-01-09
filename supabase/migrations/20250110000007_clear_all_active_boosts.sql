-- TUM AKTIF BOOST OTURUMLARINI VE KREDILERINI TEMIZLE
-- Bu migration tum kullanicilarin aktif boost oturumlarini deaktif eder ve boost kredilerini sifirlar

-- Aktif boost oturumlarini deaktif et
UPDATE boost_sessions 
SET 
  is_active = false,
  updated_at = NOW()
WHERE is_active = true;

-- Boost kredilerini sifirla
UPDATE user_credits 
SET 
  amount = 0,
  updated_at = NOW()
WHERE credit_type = 'boost' AND amount > 0;

-- Temizlenen oturum ve kredi sayisini logla
DO $$
DECLARE
  v_cleared_sessions INTEGER;
  v_cleared_credits INTEGER;
BEGIN
  -- Temizlenen oturum sayisini al
  SELECT COUNT(*) INTO v_cleared_sessions
  FROM boost_sessions 
  WHERE is_active = false 
    AND updated_at >= NOW() - INTERVAL '1 minute';
  
  -- Sifirlanan kredi sayisini al
  SELECT COUNT(*) INTO v_cleared_credits
  FROM user_credits 
  WHERE credit_type = 'boost' 
    AND amount = 0 
    AND updated_at >= NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE 'Temizlenen aktif boost oturum sayisi: %', v_cleared_sessions;
  RAISE NOTICE 'Sifirlanan boost kredi sayisi: %', v_cleared_credits;
END $$;

-- Boost oturumlarini otomatik temizleme fonksiyonunu da calistir
SELECT deactivate_expired_boost_sessions();

-- Comment
COMMENT ON TABLE boost_sessions IS 'Kullanicilarin boost oturumlari - tum aktif oturumlar ve krediler temizlendi (2026-01-10)';