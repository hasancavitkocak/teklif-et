-- Discover Feed Sistemi
-- Her kullanıcı için önceden hazırlanmış feed
-- Performans optimizasyonu için

-- 1. Discover Feed Tablosu
CREATE TABLE IF NOT EXISTS discover_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  shown BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, proposal_id)
);

-- Index'ler
CREATE INDEX idx_discover_feed_user_shown ON discover_feed(user_id, shown, position);
CREATE INDEX idx_discover_feed_proposal ON discover_feed(proposal_id);

-- 2. Yeni teklif oluşunca otomatik olarak tüm kullanıcılara ekle
CREATE OR REPLACE FUNCTION add_proposal_to_all_feeds()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  max_pos INTEGER;
BEGIN
  -- Sadece aktif teklifler için
  IF NEW.status = 'active' THEN
    -- Her kullanıcı için ayrı ayrı ekle
    FOR user_record IN 
      SELECT id FROM profiles WHERE id != NEW.creator_id
    LOOP
      -- Kullanıcının mevcut max position'ını al
      SELECT COALESCE(MAX(position), 0) INTO max_pos
      FROM discover_feed
      WHERE user_id = user_record.id;
      
      -- Feed'e ekle
      INSERT INTO discover_feed (user_id, proposal_id, position, shown)
      VALUES (user_record.id, NEW.id, max_pos + 1, false)
      ON CONFLICT (user_id, proposal_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_proposal_created ON proposals;
CREATE TRIGGER on_proposal_created
AFTER INSERT ON proposals
FOR EACH ROW
EXECUTE FUNCTION add_proposal_to_all_feeds();

-- 3. Başvuru yapıldığında feed'den kaldır
CREATE OR REPLACE FUNCTION remove_from_feed_on_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM discover_feed
  WHERE user_id = NEW.requester_id
  AND proposal_id = NEW.proposal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_proposal_request_created ON proposal_requests;
CREATE TRIGGER on_proposal_request_created
AFTER INSERT ON proposal_requests
FOR EACH ROW
EXECUTE FUNCTION remove_from_feed_on_request();

-- 4. Teklif silindiğinde feed'den kaldır
CREATE OR REPLACE FUNCTION remove_proposal_from_all_feeds()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM discover_feed
  WHERE proposal_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_proposal_deleted ON proposals;
CREATE TRIGGER on_proposal_deleted
BEFORE DELETE ON proposals
FOR EACH ROW
EXECUTE FUNCTION remove_proposal_from_all_feeds();

-- 5. Mevcut teklifler için feed oluştur (ilk kurulum)
INSERT INTO discover_feed (user_id, proposal_id, position, shown)
SELECT 
  prof.id as user_id,
  p.id as proposal_id,
  ROW_NUMBER() OVER (PARTITION BY prof.id ORDER BY p.is_boosted DESC, p.created_at DESC) as position,
  false as shown
FROM profiles prof
CROSS JOIN proposals p
WHERE p.status = 'active'
  AND p.creator_id != prof.id
  AND NOT EXISTS (
    SELECT 1 FROM proposal_requests pr
    WHERE pr.requester_id = prof.id
    AND pr.proposal_id = p.id
  )
ON CONFLICT (user_id, proposal_id) DO NOTHING;

-- RLS Policies
ALTER TABLE discover_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own feed" ON discover_feed;
DROP POLICY IF EXISTS "Users can update their own feed" ON discover_feed;

-- Kullanıcılar sadece kendi feed'lerini görebilir
CREATE POLICY "Users can view their own feed"
ON discover_feed
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Kullanıcılar kendi feed'lerini güncelleyebilir (shown flag için)
CREATE POLICY "Users can update their own feed"
ON discover_feed
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger'lar için INSERT izni (SECURITY DEFINER ile çalışır)
CREATE POLICY "Allow trigger inserts"
ON discover_feed
FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON TABLE discover_feed IS 'Her kullanıcı için önceden hazırlanmış teklif feed''i - performans optimizasyonu';
COMMENT ON COLUMN discover_feed.position IS 'Feed''deki sıralama - boosted teklifler önce';
COMMENT ON COLUMN discover_feed.shown IS 'Kullanıcıya gösterildi mi?';
