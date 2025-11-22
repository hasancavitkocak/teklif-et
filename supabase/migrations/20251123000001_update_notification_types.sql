/*
  # Update Notification Types

  ## Overview
  Bildirim sistemine yeni tipler ekleniyor:
  - proposal_invitation: Teklife davet edilme
  - invitation_accepted: Davet kabul edilme
  - invitation_declined: Davet reddedilme (opsiyonel)

  ## Changes
  - notifications tablosuna yeni tipler ekleniyor
  - related_user_id ve related_proposal_id kolonları ekleniyor (daha kolay erişim için)
*/

-- Yeni kolonlar ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'related_user_id') THEN
    ALTER TABLE notifications ADD COLUMN related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' 
                 AND column_name = 'related_proposal_id') THEN
    ALTER TABLE notifications ADD COLUMN related_proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_notifications_related_user ON notifications(related_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_proposal ON notifications(related_proposal_id);

-- Yorum güncelle
COMMENT ON COLUMN notifications.type IS 'Bildirim tipi: match, request_accepted, request_rejected, new_request, proposal_invitation, invitation_accepted, invitation_declined';
COMMENT ON COLUMN notifications.related_user_id IS 'İlgili kullanıcı ID (davet eden, eşleşen, vb.)';
COMMENT ON COLUMN notifications.related_proposal_id IS 'İlgili teklif ID';
