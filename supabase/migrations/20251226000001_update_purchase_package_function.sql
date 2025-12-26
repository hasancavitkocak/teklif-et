-- Google Play Store bilgilerini destekleyecek şekilde purchase_package fonksiyonunu güncelle

CREATE OR REPLACE FUNCTION purchase_package(
    p_user_id UUID,
    p_package_id UUID,
    p_payment_method TEXT,
    p_transaction_id TEXT,
    p_platform_transaction_id TEXT DEFAULT NULL,
    p_store_platform TEXT DEFAULT NULL,
    p_store_product_id TEXT DEFAULT NULL,
    p_store_receipt_data TEXT DEFAULT NULL,
    p_purchase_time BIGINT DEFAULT NULL,
    p_purchase_state INTEGER DEFAULT NULL,
    p_acknowledged BOOLEAN DEFAULT false,
    p_auto_renewing_store BOOLEAN DEFAULT NULL,
    p_store_order_id TEXT DEFAULT NULL,
    p_package_name TEXT DEFAULT NULL,
    p_store_signature TEXT DEFAULT NULL,
    p_original_json TEXT DEFAULT NULL,
    p_purchase_token TEXT DEFAULT NULL
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
    
    -- Create purchase record with all Google Play Store details
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
        expires_at,
        auto_renew,
        store_platform,
        store_product_id,
        store_receipt_data,
        purchase_time,
        purchase_state,
        acknowledged,
        auto_renewing_store,
        store_order_id,
        package_name,
        store_signature,
        original_json,
        purchase_token
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
        v_expires_at,
        COALESCE(p_auto_renewing_store, true),
        p_store_platform,
        p_store_product_id,
        p_store_receipt_data,
        p_purchase_time,
        p_purchase_state,
        p_acknowledged,
        p_auto_renewing_store,
        p_store_order_id,
        p_package_name,
        p_store_signature,
        p_original_json,
        p_purchase_token
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