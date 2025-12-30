-- GÜVENLİ Content Moderation Sistemi
-- Mevcut fotoğrafları koruyarak yeni sistem ekler

-- Önce backup oluştur
CREATE TABLE IF NOT EXISTS profile_photos_backup AS 
SELECT * FROM profile_photos WHERE 1=0; -- Boş tablo yapısı

-- Moderation durumları için enum
DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profile photos tablosuna moderation alanları ekle
ALTER TABLE profile_photos 
ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'approved', -- MEVCUT FOTOĞRAFLAR ONAYLANMIŞ OLSUN
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true, -- MEVCUT FOTOĞRAFLAR GÖRÜNÜR KALSIN
ADD COLUMN IF NOT EXISTS vision_results JSONB;

-- Mevcut fotoğrafları onaylanmış olarak işaretle
UPDATE profile_photos 
SET 
  moderation_status = 'approved',
  is_visible = true,
  moderated_at = NOW()
WHERE moderation_status IS NULL OR moderation_status = 'pending';

-- Content moderation logs tablosu
CREATE TABLE IF NOT EXISTS content_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  reason TEXT,
  moderator_id UUID REFERENCES profiles(id),
  vision_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE content_moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own moderation logs" ON content_moderation_logs;
CREATE POLICY "Users can view their own moderation logs"
  ON content_moderation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Otomatik moderation trigger fonksiyonu (SADECE YENİ FOTOĞRAFLAR İÇİN)
CREATE OR REPLACE FUNCTION trigger_auto_moderation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece yeni fotoğraflar için moderation
  NEW.is_visible := false;
  NEW.moderation_status := 'pending';
  
  -- Log oluştur
  INSERT INTO content_moderation_logs (
    content_type,
    content_id,
    user_id,
    action,
    reason
  ) VALUES (
    'profile_photo',
    NEW.id,
    NEW.profile_id,
    'pending',
    'Automatic moderation queued for new photo'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı henüz AKTİF ETME (manuel olarak aktif edeceksin)
-- DROP TRIGGER IF EXISTS on_photo_upload_moderation ON profile_photos;
-- CREATE TRIGGER on_photo_upload_moderation
--   BEFORE INSERT ON profile_photos
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_auto_moderation();

-- Onaylanmış fotoğraflar view'i
CREATE OR REPLACE VIEW approved_profile_photos AS
SELECT 
  pp.*,
  p.name as profile_name
FROM profile_photos pp
JOIN profiles p ON pp.profile_id = p.id
WHERE pp.moderation_status = 'approved' 
  AND pp.is_visible = true;

-- Manuel onaylama fonksiyonu
CREATE OR REPLACE FUNCTION manually_approve_photo(
  photo_id UUID,
  moderator_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profile_photos
  SET 
    moderation_status = 'approved',
    is_visible = true,
    moderated_at = NOW(),
    moderated_by = moderator_id
  WHERE id = photo_id;
  
  INSERT INTO content_moderation_logs (
    content_type,
    content_id,
    user_id,
    action,
    moderator_id,
    reason
  ) SELECT
    'profile_photo',
    photo_id,
    pp.profile_id,
    'approved',
    moderator_id,
    'Manually approved by moderator'
  FROM profile_photos pp
  WHERE pp.id = photo_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_profile_photos_moderation ON profile_photos(moderation_status, is_visible);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_content ON content_moderation_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON content_moderation_logs(user_id, created_at);

-- Bilgi mesajı
DO $$
BEGIN
  RAISE NOTICE '✅ GÜVENLİ MODERATION SİSTEMİ KURULDU';
  RAISE NOTICE '📸 Mevcut fotoğraflar: KORUNDU ve ONAYLANDI';
  RAISE NOTICE '🔧 Trigger: HENÜZ AKTİF DEĞİL (manuel aktif edeceksin)';
  RAISE NOTICE '🎯 Sonraki adım: Test et, sonra trigger''ı aktif et';
END $$;