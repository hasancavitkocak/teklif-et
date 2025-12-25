-- Google Play Store entegrasyonu için package_purchases tablosuna yeni kolonlar ekle

-- Store platform bilgisi için kolon ekle
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS store_platform TEXT CHECK (store_platform IN ('android', 'ios', 'web'));

-- Store product ID için kolon ekle  
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS store_product_id TEXT;

-- Store receipt data için kolon ekle
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS store_receipt_data TEXT;

-- Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_package_purchases_store_platform 
ON public.package_purchases(store_platform);

CREATE INDEX IF NOT EXISTS idx_package_purchases_store_product_id 
ON public.package_purchases(store_product_id);

CREATE INDEX IF NOT EXISTS idx_package_purchases_transaction_id 
ON public.package_purchases(transaction_id);

CREATE INDEX IF NOT EXISTS idx_package_purchases_platform_transaction_id 
ON public.package_purchases(platform_transaction_id);

-- Comment'ler ekle
COMMENT ON COLUMN public.package_purchases.store_platform IS 'Satın almanın yapıldığı platform (android, ios, web)';
COMMENT ON COLUMN public.package_purchases.store_product_id IS 'Store''da tanımlı ürün ID''si (premium_monthly, superlike5 vs.)';
COMMENT ON COLUMN public.package_purchases.store_receipt_data IS 'Store''dan gelen receipt/token bilgisi';