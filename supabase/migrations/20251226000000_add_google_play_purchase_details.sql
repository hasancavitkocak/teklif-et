-- Google Play Store satın alma detayları için ek kolonlar

-- Satın alma zamanı (Google Play'den gelen purchaseTime)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS purchase_time BIGINT;

-- Satın alma durumu (Google Play'den gelen purchaseState)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS purchase_state INTEGER;

-- Onaylanma durumu (Google Play'den gelen acknowledged)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;

-- Otomatik yenileme durumu (Google Play'den gelen autoRenewing)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS auto_renewing_store BOOLEAN;

-- Google Play order ID (Google Play'den gelen orderId)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS store_order_id TEXT;

-- Uygulama paket adı (Google Play'den gelen packageName)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS package_name TEXT;

-- Google Play imzası (Google Play'den gelen signature)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS store_signature TEXT;

-- Orijinal JSON verisi (Google Play'den gelen originalJson)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS original_json TEXT;

-- Purchase token (Google Play'den gelen purchaseToken)
ALTER TABLE public.package_purchases 
ADD COLUMN IF NOT EXISTS purchase_token TEXT;

-- Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_package_purchases_purchase_token 
ON public.package_purchases(purchase_token);

CREATE INDEX IF NOT EXISTS idx_package_purchases_store_order_id 
ON public.package_purchases(store_order_id);

CREATE INDEX IF NOT EXISTS idx_package_purchases_purchase_time 
ON public.package_purchases(purchase_time);

-- Comment'ler ekle
COMMENT ON COLUMN public.package_purchases.purchase_time IS 'Google Play satın alma zamanı (timestamp)';
COMMENT ON COLUMN public.package_purchases.purchase_state IS 'Google Play satın alma durumu (0=purchased, 1=canceled)';
COMMENT ON COLUMN public.package_purchases.acknowledged IS 'Google Play onaylanma durumu';
COMMENT ON COLUMN public.package_purchases.auto_renewing_store IS 'Google Play otomatik yenileme durumu';
COMMENT ON COLUMN public.package_purchases.store_order_id IS 'Google Play order ID';
COMMENT ON COLUMN public.package_purchases.package_name IS 'Uygulama paket adı';
COMMENT ON COLUMN public.package_purchases.store_signature IS 'Google Play imzası';
COMMENT ON COLUMN public.package_purchases.original_json IS 'Google Play orijinal JSON verisi';
COMMENT ON COLUMN public.package_purchases.purchase_token IS 'Google Play purchase token';