import { supabase } from '@/lib/supabase';

export interface Package {
  id: string;
  name: string;
  description?: string;
  type: 'subscription' | 'addon';
  category: 'premium' | 'super_like' | 'boost';
  duration_type?: 'weekly' | 'monthly' | 'yearly' | 'one_time';
  duration_value?: number;
  price_amount: number;
  currency: string;
  features: string[];
  credits_amount?: number;
  is_popular: boolean;
  sort_order: number;
}

export interface PackagePurchase {
  id: string;
  user_id: string;
  package_id: string;
  purchase_type: 'subscription' | 'addon';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  price_paid: number;
  currency: string;
  payment_method?: string;
  transaction_id?: string;
  platform_transaction_id?: string;
  starts_at?: string;
  expires_at?: string;
  auto_renew: boolean;
  cancelled_at?: string;
  created_at: string;
}

export interface UserCredit {
  credit_type: 'super_like' | 'boost';
  amount: number;
  expires_at?: string;
}

class PackagesAPI {
  /**
   * Aktif paketleri getir
   */
  async getActivePackages(type?: 'subscription' | 'addon'): Promise<Package[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_packages', {
        package_type: type || null
      });

      if (error) {
        console.error('❌ Paketler getirme hatası:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Paketler getirme hatası:', error);
      return [];
    }
  }

  /**
   * Subscription paketlerini getir
   */
  async getSubscriptionPackages(): Promise<Package[]> {
    return this.getActivePackages('subscription');
  }

  /**
   * Addon paketlerini getir
   */
  async getAddonPackages(): Promise<Package[]> {
    return this.getActivePackages('addon');
  }

  /**
   * Google Play Store satın alma kaydet
   */
  async recordGooglePlayPurchase(
    packageId: string,
    transactionId: string,
    purchaseToken: string,
    productId: string,
    purchaseDetails?: {
      purchaseTime?: number | null;
      purchaseState?: number | string | null; // Can be number (0,1) or string ('purchased', 'pending')
      acknowledged?: boolean | null;
      autoRenewing?: boolean | null;
      orderId?: string | null;
      packageName?: string | null;
      originalJson?: string | null;
      signature?: string | null;
    } | null
  ): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
    const startTime = Date.now();
    console.log('💾 ===== DB KAYIT BAŞLADI =====');
    console.log('📋 DB Kayit Request:', {
      packageId: packageId || 'YOK',
      transactionId: transactionId ? `${transactionId.substring(0, 20)}...` : 'YOK',
      purchaseToken: purchaseToken ? `${purchaseToken.substring(0, 20)}...` : 'YOK',
      productId: productId || 'YOK',
      purchaseDetails: purchaseDetails ? {
        purchaseTime: purchaseDetails.purchaseTime ?? 'undefined',
        purchaseState: purchaseDetails.purchaseState ?? 'undefined',
        acknowledged: purchaseDetails.acknowledged ?? 'undefined',
        autoRenewing: purchaseDetails.autoRenewing ?? 'undefined',
        orderId: purchaseDetails.orderId ?? 'undefined',
        packageName: purchaseDetails.packageName ?? 'undefined',
        hasOriginalJson: !!purchaseDetails.originalJson,
        hasSignature: !!purchaseDetails.signature
      } : 'YOK',
      timestamp: new Date().toISOString()
    });

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ Kullanıcı oturumu bulunamadı');
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      console.log('👤 User ID:', user.user.id);

      // Google Play Store satın almasını kaydet - sadece gerekli parametreler
      console.log('🚀 Supabase RPC çağrılıyor: record_google_play_purchase');
      
      const rpcParams = {
        p_user_id: user.user.id,
        p_package_id: packageId,
        p_transaction_id: transactionId || null,
        p_purchase_token: purchaseToken || null,
        p_product_id: productId || null,
        p_purchase_time_ms: purchaseDetails?.purchaseTime || null
      };
      
      console.log('📋 RPC Parameters (simplified):', {
        p_user_id: rpcParams.p_user_id,
        p_package_id: rpcParams.p_package_id,
        p_transaction_id: rpcParams.p_transaction_id ? `${rpcParams.p_transaction_id.substring(0, 20)}...` : 'YOK',
        p_purchase_token: rpcParams.p_purchase_token ? `${rpcParams.p_purchase_token.substring(0, 20)}...` : 'YOK',
        p_product_id: rpcParams.p_product_id,
        p_purchase_time_ms: rpcParams.p_purchase_time_ms
      });

      const { data, error } = await supabase.rpc('record_google_play_purchase', rpcParams);

      const responseTime = Date.now() - startTime;
      console.log('⏱️ DB kayit response süresi:', responseTime + 'ms');

      if (error) {
        console.error('❌ DB kayit RPC hatası:', {
          error: error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: error.message };
      }

      console.log('✅ DB kayit response:', data);
      console.log('🎉 ===== DB KAYIT TAMAMLANDI =====');
      
      return { success: true, purchaseId: data };
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ ===== DB KAYIT HATASI =====');
      console.error('⏱️ Hata süresi:', errorTime + 'ms');
      console.error('🔍 DB kayit hatası:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error: error
      });
      return { success: false, error: error.message || 'Satın alma kaydedilemedi' };
    }
  }

  /**
   * Paket satın al (eski method - backward compatibility için)
   */
  async purchasePackage(
    packageId: string,
    paymentMethod: string,
    transactionId: string,
    platformTransactionId?: string
  ): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      const { data, error } = await supabase.rpc('purchase_package', {
        p_user_id: user.user.id,
        p_package_id: packageId,
        p_payment_method: paymentMethod,
        p_transaction_id: transactionId,
        p_platform_transaction_id: platformTransactionId
      });

      if (error) {
        console.error('❌ Paket satın alma hatası:', error);
        return { success: false, error: error.message };
      }

      return { success: true, purchaseId: data };
    } catch (error: any) {
      console.error('❌ Paket satın alma hatası:', error);
      return { success: false, error: error.message || 'Satın alma işlemi başarısız' };
    }
  }

  /**
   * Kullanıcının satın aldığı paketleri getir
   */
  async getUserPurchases(): Promise<PackagePurchase[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('package_purchases')
        .select(`
          *,
          package:packages(name, description, type, category)
        `)
        .eq('user_id', user.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Kullanıcı satın alımları getirme hatası:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Kullanıcı satın alımları getirme hatası:', error);
      return [];
    }
  }

  /**
   * Aktif subscription'ı getir
   */
  async getActiveSubscription(): Promise<PackagePurchase | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('package_purchases')
        .select(`
          *,
          package:packages(name, description, type, category)
        `)
        .eq('user_id', user.user.id)
        .eq('purchase_type', 'subscription')
        .eq('status', 'completed')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Aktif subscription getirme hatası:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Aktif subscription getirme hatası:', error);
      return null;
    }
  }

  /**
   * Kullanıcının kredilerini getir
   */
  async getUserCredits(): Promise<UserCredit[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: user.user.id
      });

      if (error) {
        console.error('❌ Kullanıcı kredileri getirme hatası:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Kullanıcı kredileri getirme hatası:', error);
      return [];
    }
  }

  /**
   * Kredi kullan
   */
  async useCredit(
    creditType: 'super_like' | 'boost',
    amount: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      // Mevcut krediyi kontrol et
      const { data: currentCredit, error: creditError } = await supabase
        .from('user_credits')
        .select('amount')
        .eq('user_id', user.user.id)
        .eq('credit_type', creditType)
        .single();

      if (creditError || !currentCredit || currentCredit.amount < amount) {
        return { success: false, error: 'Yetersiz kredi' };
      }

      // Krediyi azalt
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          amount: currentCredit.amount - amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user.id)
        .eq('credit_type', creditType);

      if (updateError) {
        console.error('❌ Kredi kullanma hatası:', updateError);
        return { success: false, error: 'Kredi kullanılamadı' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Kredi kullanma hatası:', error);
      return { success: false, error: error.message || 'Kredi kullanılamadı' };
    }
  }

  /**
   * Boost kredisi kullan
   */
  async useBoostCredit(): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      const { data, error } = await supabase.rpc('use_boost_credit', {
        p_user_id: user.user.id
      });

      if (error) {
        console.error('❌ Boost kredisi kullanma hatası:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return { 
        success: true, 
        expiresAt: data.expires_at 
      };
    } catch (error: any) {
      console.error('❌ Boost kredisi kullanma hatası:', error);
      return { success: false, error: error.message || 'Boost kredisi kullanılamadı' };
    }
  }

  /**
   * Aktif boost oturumunu getir
   */
  async getActiveBoostSession(): Promise<{
    active: boolean;
    sessionId?: string;
    startedAt?: string;
    expiresAt?: string;
    remainingSeconds?: number;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { active: false };
      }

      const { data, error } = await supabase.rpc('get_active_boost_session', {
        p_user_id: user.user.id
      });

      if (error) {
        console.error('❌ Aktif boost oturumu getirme hatası:', error);
        return { active: false };
      }

      return data;
    } catch (error: any) {
      console.error('❌ Aktif boost oturumu getirme hatası:', error);
      return { active: false };
    }
  }

  /**
   * Boost cooldown durumunu kontrol et
   */
  async getBoostCooldownStatus(): Promise<{
    hasCooldown: boolean;
    cooldownSeconds: number;
    canUseBoost: boolean;
  }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { hasCooldown: false, cooldownSeconds: 0, canUseBoost: false };
      }

      const { data, error } = await supabase.rpc('get_boost_cooldown_status', {
        p_user_id: user.user.id
      });

      if (error) {
        console.error('❌ Boost cooldown durumu getirme hatası:', error);
        return { hasCooldown: false, cooldownSeconds: 0, canUseBoost: false };
      }

      return {
        hasCooldown: data.has_cooldown,
        cooldownSeconds: data.cooldown_seconds,
        canUseBoost: data.can_use_boost
      };
    } catch (error: any) {
      console.error('❌ Boost cooldown durumu getirme hatası:', error);
      return { hasCooldown: false, cooldownSeconds: 0, canUseBoost: false };
    }
  }

  /**
   * Subscription iptal et
   */
  async cancelSubscription(purchaseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      const { error } = await supabase
        .from('package_purchases')
        .update({ 
          auto_renew: false,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .eq('user_id', user.user.id);

      if (error) {
        console.error('❌ Subscription iptal hatası:', error);
        return { success: false, error: 'Subscription iptal edilemedi' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Subscription iptal hatası:', error);
      return { success: false, error: error.message || 'Subscription iptal edilemedi' };
    }
  }
}

export const packagesAPI = new PackagesAPI();