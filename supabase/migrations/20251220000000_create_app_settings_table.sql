-- Create app_settings table for global application settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading settings (everyone can read)
CREATE POLICY "Anyone can read app settings" ON public.app_settings
    FOR SELECT USING (true);

-- Create policy for updating settings (only service role)
CREATE POLICY "Only service role can modify app settings" ON public.app_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
    ('sms_mode', '"development"', 'SMS gönderim modu: development (demo kod) veya production (gerçek SMS)'),
    ('demo_otp_code', '"123456"', 'Development modunda kullanılacak demo OTP kodu'),
    ('app_maintenance', 'false', 'Uygulama bakım modu'),
    ('max_daily_proposals', '5', 'Günlük maksimum teklif sayısı'),
    ('max_daily_requests', '10', 'Günlük maksimum eşleşme isteği sayısı')
ON CONFLICT (key) DO NOTHING;

-- Create function to get setting value
CREATE OR REPLACE FUNCTION get_app_setting(setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT value 
        FROM public.app_settings 
        WHERE key = setting_key
    );
END;
$$;

-- Create function to update setting value
CREATE OR REPLACE FUNCTION update_app_setting(setting_key TEXT, setting_value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.app_settings 
    SET value = setting_value, updated_at = now()
    WHERE key = setting_key;
    
    RETURN FOUND;
END;
$$;