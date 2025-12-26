-- HTTP extension yerine basit doğrulama kullan
-- Google Play API için HTTP çağrısı yapmak yerine basit kontroller yap

-- Sadece pg_net extension'ını dene (eğer varsa)
DO $$
BEGIN
    -- pg_net extension'ını dene
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
        CREATE EXTENSION IF NOT EXISTS pg_net;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_net yoksa da sorun yok, basit doğrulama kullanacağız
        NULL;
END $$;

COMMENT ON SCHEMA public IS 'HTTP extension kurulumu atlandı - basit doğrulama kullanılıyor';