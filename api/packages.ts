import { supabase } from '@/lib/supabase';

export interface Package {
  id: string;
  name: string;
  description?: string;
  type: 'subscription' | 'addon';
  category: 'premium' | 'super_like' | 'boost' | 'profile_views';
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
  credit_type: 'super_like' | 'boost' | 'profile_views';
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
   * Paket satın al
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
    creditType: 'super_like' | 'boost' | 'profile_views',
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