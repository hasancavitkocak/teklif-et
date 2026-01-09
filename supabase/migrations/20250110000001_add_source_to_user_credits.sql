-- user_credits tablosuna source kolonu ekle
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'purchase' 
CHECK (source IN ('purchase', 'bonus', 'refund', 'admin'));

-- Mevcut kayitlara default deger ata
UPDATE public.user_credits 
SET source = 'purchase' 
WHERE source IS NULL;

-- Source kolonu NOT NULL yap
ALTER TABLE public.user_credits 
ALTER COLUMN source SET NOT NULL;

-- Comment ekle
COMMENT ON COLUMN public.user_credits.source IS 'Kredi kaynagi: purchase, bonus, refund, admin';