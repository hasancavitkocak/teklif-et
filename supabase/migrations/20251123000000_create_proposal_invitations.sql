/*
  # Proposal Invitations System

  ## Overview
  Teklif sahiplerinin kullanıcıları davet edebilmesi için sistem.

  ## New Table

  ### proposal_invitations
  - `id` (uuid, PK) - Davet identifier
  - `proposal_id` (uuid, FK) - Hangi teklif
  - `inviter_id` (uuid, FK) - Daveti gönderen (teklif sahibi)
  - `invited_user_id` (uuid, FK) - Davet edilen kullanıcı
  - `status` (text) - pending/accepted/declined
  - `created_at` (timestamptz) - Davet zamanı
  - `responded_at` (timestamptz) - Yanıt zamanı
  - UNIQUE(proposal_id, invited_user_id) - Bir kullanıcı bir teklife sadece bir kez davet edilebilir

  ## Security
  - RLS enabled
  - Teklif sahipleri davet gönderebilir
  - Davet edilen kullanıcılar kendi davetlerini görebilir ve yanıtlayabilir
*/

-- Proposal invitations table
CREATE TABLE IF NOT EXISTS proposal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  -- Bir kullanıcı bir teklife sadece bir kez davet edilebilir
  UNIQUE(proposal_id, invited_user_id),
  -- Kullanıcı kendi teklifine davet edemez
  CHECK (inviter_id != invited_user_id)
);

ALTER TABLE proposal_invitations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_invitations_proposal ON proposal_invitations(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_invitations_inviter ON proposal_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_proposal_invitations_invited_user ON proposal_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_invitations_status ON proposal_invitations(status);

-- RLS Policies

-- Teklif sahipleri kendi tekliflerine ait davetleri görebilir
CREATE POLICY "Proposal creators can view invitations for their proposals"
  ON proposal_invitations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = inviter_id OR
    auth.uid() IN (
      SELECT creator_id FROM proposals WHERE id = proposal_id
    )
  );

-- Davet edilen kullanıcılar kendi davetlerini görebilir
CREATE POLICY "Users can view their own invitations"
  ON proposal_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = invited_user_id);

-- Teklif sahipleri davet gönderebilir
CREATE POLICY "Proposal creators can send invitations"
  ON proposal_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id AND
    auth.uid() IN (
      SELECT creator_id FROM proposals WHERE id = proposal_id
    )
  );

-- Davet edilen kullanıcılar davetlerini yanıtlayabilir (status update)
CREATE POLICY "Invited users can respond to invitations"
  ON proposal_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_user_id)
  WITH CHECK (auth.uid() = invited_user_id);

-- Teklif sahipleri bekleyen davetleri iptal edebilir (delete)
CREATE POLICY "Proposal creators can cancel pending invitations"
  ON proposal_invitations FOR DELETE
  TO authenticated
  USING (
    auth.uid() = inviter_id AND
    status = 'pending'
  );

-- Trigger: responded_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_invitation_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitation_responded_at
  BEFORE UPDATE ON proposal_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_responded_at();

-- Trigger: Davet kabul edildiğinde match oluştur
CREATE OR REPLACE FUNCTION create_match_on_invitation_accept()
RETURNS TRIGGER AS $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
BEGIN
  -- Sadece accepted durumunda çalış
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- user1_id < user2_id olacak şekilde sırala
    IF NEW.inviter_id < NEW.invited_user_id THEN
      v_user1_id := NEW.inviter_id;
      v_user2_id := NEW.invited_user_id;
    ELSE
      v_user1_id := NEW.invited_user_id;
      v_user2_id := NEW.inviter_id;
    END IF;

    -- Match oluştur (duplicate kontrolü ile)
    INSERT INTO matches (proposal_id, user1_id, user2_id)
    VALUES (NEW.proposal_id, v_user1_id, v_user2_id)
    ON CONFLICT DO NOTHING;

    -- Bildirim oluştur (inviter'a)
    INSERT INTO notifications (user_id, type, title, message, related_user_id, related_proposal_id)
    VALUES (
      NEW.inviter_id,
      'invitation_accepted',
      'Davet Kabul Edildi! 🎉',
      'Davetiniz kabul edildi ve eşleştiniz!',
      NEW.invited_user_id,
      NEW.proposal_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_match_on_invitation_accept
  AFTER UPDATE ON proposal_invitations
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_invitation_accept();

-- Trigger: Davet gönderildiğinde bildirim oluştur
CREATE OR REPLACE FUNCTION notify_on_invitation_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Davet edilen kullanıcıya bildirim gönder
  INSERT INTO notifications (user_id, type, title, message, related_user_id, related_proposal_id)
  VALUES (
    NEW.invited_user_id,
    'proposal_invitation',
    'Yeni Davet! 💌',
    'Bir teklife davet edildiniz!',
    NEW.inviter_id,
    NEW.proposal_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_invitation_created
  AFTER INSERT ON proposal_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_invitation_created();
