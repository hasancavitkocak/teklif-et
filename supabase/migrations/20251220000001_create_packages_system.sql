-- Create packages table for managing subscription plans and add-ons
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'addon')),
    category TEXT NOT NULL CHECK (category IN ('premium', 'super_like', 'boost', 'profile_views')),
    duration_type TEXT CHECK (duration_type IN ('weekly', 'monthly', 'yearly', 'one_time')),
    duration_value INTEGER, -- Hafta/ay/yıl sayısı
    price_amount INTEGER NOT NULL, -- Kuruş cinsinden
    currency TEXT DEFAULT 'TRY',
    features JSONB DEFAULT '[]'::jsonb,
    credits_amount INTEGER DEFAULT 0, -- Ek paketler için kredi miktarı
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create package_purchases table for tracking purchases
CREATE TABLE IF NOT EXISTS public.package_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
    purchase_type TEXT NOT NULL CHECK (purchase_type IN ('subscription', 'addon')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    price_paid INTEGER NOT NULL,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT,
    transaction_id TEXT,
    platform_transaction_id TEXT, -- Google Play/App Store transaction ID
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_credits table for tracking addon credits
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credit_type TEXT NOT NULL CHECK (credit_type IN ('super_like', 'boost', 'profile_views')),
    amount INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, credit_type)
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packages (everyone can read active packages)
CREATE POLICY "Anyone can read active packages" ON public.packages
    FOR SELECT USING (is_active = true);

-- RLS Policies for package_purchases (users can only see their own purchases)
CREATE POLICY "Users can read own purchases" ON public.package_purchases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON public.package_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_credits (users can only see their own credits)
CREATE POLICY "Users can read own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Insert default packages
INSERT INTO public.packages (name, description, type, category, duration_type, duration_value, price_amount, features, is_popular, sort_order, credits_amount) VALUES
-- Subscription Plans
('Haftalık Premium', 'Tüm premium özellikler 1 hafta boyunca', 'subscription', 'premium', 'weekly', 1, 14900, 
 '["Günde 5 Teklif", "Günde 3 Super Like", "Sınırsız Eşleşme İsteği", "Gelişmiş Filtreleme"]'::jsonb, false, 1, 0),

('Aylık Premium', 'Tüm premium özellikler 1 ay boyunca', 'subscription', 'premium', 'monthly', 1, 39900, 
 '["Günde 5 Teklif", "Günde 3 Super Like", "Sınırsız Eşleşme İsteği", "Gelişmiş Filtreleme", "33% Tasarruf"]'::jsonb, true, 2, 0),

('Yıllık Premium', 'Tüm premium özellikler 1 yıl boyunca', 'subscription', 'premium', 'yearly', 1, 399900, 
 '["Günde 5 Teklif", "Günde 3 Super Like", "Sınırsız Eşleşme İsteği", "Gelişmiş Filtreleme", "44% Tasarruf"]'::jsonb, false, 3, 0),

-- Add-on Packages
('Super Like Paketi', '10 adet Super Like kredisi', 'addon', 'super_like', 'one_time', NULL, 9900, 
 '["10 Super Like Kredisi", "Günlük limitten bağımsız", "Tek seferlik ödeme"]'::jsonb, false, 4, 10),

('Boost Paketi', '30 dakika profilinizi öne çıkarın', 'addon', 'boost', 'one_time', NULL, 4900, 
 '["30 dakika boost", "Daha fazla görünürlük", "Tek seferlik ödeme"]'::jsonb, false, 5, 1),

('Profilimi Kim İnceledi', '7 gün boyunca profilinizi kimin incelediğini görün', 'addon', 'profile_views', 'weekly', 1, 7900, 
 '["7 gün aktif", "Profilinizi kimler inceledi", "Detaylı görüntüleme istatistikleri"]'::jsonb, false, 6, 1)

ON CONFLICT DO NOTHING;

-- Create function to get active packages
CREATE OR REPLACE FUNCTION get_active_packages(package_type TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    type TEXT,
    category TEXT,
    duration_type TEXT,
    duration_value INTEGER,
    price_amount INTEGER,
    currency TEXT,
    features JSONB,
    credits_amount INTEGER,
    is_popular BOOLEAN,
    sort_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.type,
        p.category,
        p.duration_type,
        p.duration_value,
        p.price_amount,
        p.currency,
        p.features,
        p.credits_amount,
        p.is_popular,
        p.sort_order
    FROM public.packages p
    WHERE p.is_active = true
    AND (package_type IS NULL OR p.type = package_type)
    ORDER BY p.sort_order ASC, p.price_amount ASC;
END;
$$;

-- Create function to purchase package
CREATE OR REPLACE FUNCTION purchase_package(
    p_user_id UUID,
    p_package_id UUID,
    p_payment_method TEXT,
    p_transaction_id TEXT,
    p_platform_transaction_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_package packages%ROWTYPE;
    v_purchase_id UUID;
    v_starts_at TIMESTAMP WITH TIME ZONE;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get package details
    SELECT * INTO v_package FROM public.packages WHERE id = p_package_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Package not found or inactive';
    END IF;
    
    -- Calculate dates
    v_starts_at := timezone('utc'::text, now());
    
    IF v_package.duration_type = 'weekly' THEN
        v_expires_at := v_starts_at + (v_package.duration_value || ' weeks')::interval;
    ELSIF v_package.duration_type = 'monthly' THEN
        v_expires_at := v_starts_at + (v_package.duration_value || ' months')::interval;
    ELSIF v_package.duration_type = 'yearly' THEN
        v_expires_at := v_starts_at + (v_package.duration_value || ' years')::interval;
    ELSE
        v_expires_at := NULL; -- One-time purchases don't expire
    END IF;
    
    -- Create purchase record
    INSERT INTO public.package_purchases (
        user_id,
        package_id,
        purchase_type,
        status,
        price_paid,
        currency,
        payment_method,
        transaction_id,
        platform_transaction_id,
        starts_at,
        expires_at
    ) VALUES (
        p_user_id,
        p_package_id,
        v_package.type,
        'completed',
        v_package.price_amount,
        v_package.currency,
        p_payment_method,
        p_transaction_id,
        p_platform_transaction_id,
        v_starts_at,
        v_expires_at
    ) RETURNING id INTO v_purchase_id;
    
    -- Handle subscription
    IF v_package.type = 'subscription' AND v_package.category = 'premium' THEN
        -- Update user premium status
        UPDATE public.profiles 
        SET 
            is_premium = true,
            premium_expires_at = v_expires_at,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_user_id;
    END IF;
    
    -- Handle addon credits
    IF v_package.type = 'addon' AND v_package.credits_amount > 0 THEN
        INSERT INTO public.user_credits (user_id, credit_type, amount, expires_at)
        VALUES (p_user_id, v_package.category, v_package.credits_amount, v_expires_at)
        ON CONFLICT (user_id, credit_type) 
        DO UPDATE SET 
            amount = user_credits.amount + v_package.credits_amount,
            expires_at = CASE 
                WHEN v_expires_at IS NULL THEN user_credits.expires_at
                WHEN user_credits.expires_at IS NULL THEN v_expires_at
                ELSE GREATEST(user_credits.expires_at, v_expires_at)
            END,
            updated_at = timezone('utc'::text, now());
    END IF;
    
    RETURN v_purchase_id;
END;
$$;

-- Create function to get user credits
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE (
    credit_type TEXT,
    amount INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.credit_type,
        uc.amount,
        uc.expires_at
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id
    AND uc.amount > 0
    AND (uc.expires_at IS NULL OR uc.expires_at > timezone('utc'::text, now()));
END;
$$;