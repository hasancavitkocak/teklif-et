-- Kullanıcı etkileşimleri tablosu (like, dislike, super_like)
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'super_like')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Bir kullanıcı bir teklifle sadece bir kez etkileşimde bulunabilir
    UNIQUE(user_id, proposal_id)
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_proposal_id ON user_interactions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at);

-- RLS (Row Level Security) politikaları
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi etkileşimlerini görebilir
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi etkileşimlerini ekleyebilir
CREATE POLICY "Users can insert own interactions" ON user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi etkileşimlerini güncelleyebilir
CREATE POLICY "Users can update own interactions" ON user_interactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi etkileşimlerini silebilir
CREATE POLICY "Users can delete own interactions" ON user_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_interactions_updated_at 
    BEFORE UPDATE ON user_interactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Yorum: Bu tablo sayesinde kullanıcıların tüm etkileşimleri (like, dislike, super_like) 
-- takip edilebilir ve akıllı filtreleme yapılabilir.