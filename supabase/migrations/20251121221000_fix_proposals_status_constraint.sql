-- Proposals ve Proposal Requests status constraint'lerini güncelle
-- Yeni durumları ekle: matched, auto_rejected

-- 1. Proposals tablosu - 'matched' durumunu ekle
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
CHECK (status IN ('active', 'matched', 'completed', 'cancelled', 'expired'));

-- 2. Proposal Requests tablosu - 'auto_rejected' durumunu ekle
ALTER TABLE proposal_requests DROP CONSTRAINT IF EXISTS proposal_requests_status_check;
ALTER TABLE proposal_requests ADD CONSTRAINT proposal_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_rejected'));

-- Açıklamalar
COMMENT ON COLUMN proposals.status IS 'Teklif durumu: active (aktif), matched (eşleşti), completed (tamamlandı), cancelled (iptal edildi), expired (süresi doldu)';
COMMENT ON COLUMN proposal_requests.status IS 'Başvuru durumu: pending (beklemede), accepted (kabul edildi), rejected (reddedildi), auto_rejected (otomatik reddedildi)';
