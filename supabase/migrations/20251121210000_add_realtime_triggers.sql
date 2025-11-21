/*
  # Add Real-time Triggers for Proposals System

  ## Overview
  Bu migration, teklifler sisteminde otomatik veri yükleme için trigger'ları ekler.

  ## Changes
  1. Yeni teklif oluşturulduğunda otomatik bildirim
  2. Başvuru durumu değiştiğinde otomatik bildirim
  3. Real-time subscription için publication ayarları
*/

-- Proposals tablosunu real-time için etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_requests;

-- Teklif oluşturulduğunda tetiklenecek fonksiyon
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_proposal',
    json_build_object(
      'id', NEW.id,
      'creator_id', NEW.creator_id,
      'activity_name', NEW.activity_name,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Yeni teklif trigger'ı
DROP TRIGGER IF EXISTS on_proposal_created ON proposals;
CREATE TRIGGER on_proposal_created
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_proposal();

-- Başvuru durumu değiştiğinde tetiklenecek fonksiyon
CREATE OR REPLACE FUNCTION notify_proposal_request_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'proposal_request_change',
    json_build_object(
      'id', NEW.id,
      'proposal_id', NEW.proposal_id,
      'requester_id', NEW.requester_id,
      'status', NEW.status,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Başvuru değişikliği trigger'ı
DROP TRIGGER IF EXISTS on_proposal_request_changed ON proposal_requests;
CREATE TRIGGER on_proposal_request_changed
  AFTER INSERT OR UPDATE ON proposal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_proposal_request_change();

-- Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Proposals için updated_at trigger'ı
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Proposal requests için updated_at trigger'ı
DROP TRIGGER IF EXISTS update_proposal_requests_updated_at ON proposal_requests;
CREATE TRIGGER update_proposal_requests_updated_at
  BEFORE UPDATE ON proposal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
