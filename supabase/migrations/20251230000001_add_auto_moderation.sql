-- Otomatik Content Moderation Sistemi
-- Google Vision API ile otomatik fotoğraf kontrolü

-- Moderation durumları için enum
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- Profile photos tablosuna moderation alanları ekle
ALTER TABLE profile_photos 
ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vision_results JSONB;

-- Content moderation logs tablosu
CREATE TABLE IF NOT EXISTS content_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'profile_photo', 'message', 'proposal'
  content_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'flagged'
  reason TEXT,
  moderator_id UUID REFERENCES profiles(id), -- NULL for automatic system
  vision_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE content_moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own moderation logs"
  ON content_moderation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Otomatik moderation trigger fonksiyonu
CREATE OR REPLACE FUNCTION trigger_auto_moderation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moderation_response JSONB;
BEGIN
  -- Fotoğrafı görünmez yap (moderation bekliyor)
  NEW.is_visible := false;
  NEW.moderation_status := 'pending';
  
  -- Moderation log oluştur
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
    'Automatic moderation queued'
  );

  -- Supabase Edge Function'ı çağır (async)
  -- Bu HTTP çağrısı background'da çalışacak
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/moderate-image',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'imageUrl', NEW.photo_url,
      'userId', NEW.profile_id,
      'photoId', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ekle
DROP TRIGGER IF EXISTS on_photo_upload_moderation ON profile_photos;
CREATE TRIGGER on_photo_upload_moderation
  BEFORE INSERT ON profile_photos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_moderation();

-- Sadece onaylanmış fotoğrafları göster (view)
CREATE OR REPLACE VIEW approved_profile_photos AS
SELECT 
  pp.*,
  p.name as profile_name
FROM profile_photos pp
JOIN profiles p ON pp.profile_id = p.id
WHERE pp.moderation_status = 'approved' 
  AND pp.is_visible = true;

-- Manuel onaylama fonksiyonu (acil durumlar için)
CREATE OR REPLACE FUNCTION manually_approve_photo(
  photo_id UUID,
  moderator_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fotoğrafı onayla
  UPDATE profile_photos
  SET 
    moderation_status = 'approved',
    is_visible = true,
    moderated_at = NOW(),
    moderated_by = moderator_id
  WHERE id = photo_id;
  
  -- Log ekle
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

-- Ayarlar (Edge Function için)
-- Bu ayarları Supabase dashboard'dan yapman gerekecek:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';

COMMENT ON TABLE content_moderation_logs IS 'Otomatik content moderation logları';
COMMENT ON FUNCTION trigger_auto_moderation IS 'Fotoğraf yüklendiğinde otomatik Google Vision kontrolü başlatır';
COMMENT ON FUNCTION manually_approve_photo IS 'Acil durumlar için manuel fotoğraf onaylama';