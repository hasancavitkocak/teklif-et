-- Proposals tablosuna tarih/saat ve mekan alanları ekle

-- Tarih ve saat alanı ekle
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMP WITH TIME ZONE;

-- Mekan ismi alanı ekle (opsiyonel)
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS venue_name TEXT;

-- Mevcut kayıtlar için default değer (şu andan 1 gün sonra)
UPDATE proposals 
SET event_datetime = NOW() + INTERVAL '1 day'
WHERE event_datetime IS NULL;

-- Index ekle (tarih bazlı sorgular için)
CREATE INDEX IF NOT EXISTS idx_proposals_event_datetime ON proposals(event_datetime);

COMMENT ON COLUMN proposals.event_datetime IS 'Aktivitenin gerçekleşeceği tarih ve saat';
COMMENT ON COLUMN proposals.venue_name IS 'Aktivitenin gerçekleşeceği mekan adı (opsiyonel)';
