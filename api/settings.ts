import { supabase } from '@/lib/supabase';

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  sms_mode: 'development' | 'production';
  demo_otp_code: string;
  app_maintenance: boolean;
  max_daily_proposals: number;
  max_daily_requests: number;
  netgsm_username: string;
  netgsm_password: string;
  netgsm_header: string;
}

class SettingsAPI {
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

  /**
   * Belirli bir ayarı getir
   */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K] | null> {
    try {
      // Cache kontrolü
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.value;
      }

      // Supabase'den çek
      const { data, error } = await supabase.rpc('get_app_setting', {
        setting_key: key
      });

      if (error) {
        console.error(`❌ Setting getirme hatası (${key}):`, error);
        return null;
      }

      // JSON parse et
      let value = data;
      if (typeof data === 'string') {
        try {
          value = JSON.parse(data);
        } catch {
          value = data;
        }
      }

      // Cache'e kaydet
      this.cache.set(key, { value, timestamp: Date.now() });

      return value;
    } catch (error) {
      console.error(`❌ Setting getirme hatası (${key}):`, error);
      return null;
    }
  }

  /**
   * Tüm ayarları getir
   */
  async getAllSettings(): Promise<Partial<AppSettings>> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) {
        console.error('❌ Tüm ayarları getirme hatası:', error);
        return {};
      }

      const settings: Partial<AppSettings> = {};
      
      data?.forEach((setting) => {
        let value = setting.value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // JSON parse edilemezse string olarak bırak
          }
        }
        (settings as any)[setting.key] = value;
      });

      return settings;
    } catch (error) {
      console.error('❌ Tüm ayarları getirme hatası:', error);
      return {};
    }
  }

  /**
   * Ayar güncelle (sadece admin panelinden)
   */
  async updateSetting<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_app_setting', {
        setting_key: key,
        setting_value: JSON.stringify(value)
      });

      if (error) {
        console.error(`❌ Setting güncelleme hatası (${key}):`, error);
        return false;
      }

      // Cache'i temizle
      this.cache.delete(key);

      return data === true;
    } catch (error) {
      console.error(`❌ Setting güncelleme hatası (${key}):`, error);
      return false;
    }
  }

  /**
   * SMS modunu kontrol et
   */
  async isSmsEnabled(): Promise<boolean> {
    const smsMode = await this.getSetting('sms_mode');
    return smsMode === 'production';
  }

  /**
   * Demo OTP kodunu getir
   */
  async getDemoOtpCode(): Promise<string> {
    const code = await this.getSetting('demo_otp_code');
    return code || '123456';
  }

  /**
   * Bakım modunu kontrol et
   */
  async isMaintenanceMode(): Promise<boolean> {
    const maintenance = await this.getSetting('app_maintenance');
    return maintenance === true;
  }

  /**
   * Cache'i temizle
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Netgsm yapılandırmasını getir
   */
  async getNetgsmConfig(): Promise<{
    username: string;
    password: string;
    msgheader: string;
  } | null> {
    try {
      const [username, password, header] = await Promise.all([
        this.getSetting('netgsm_username'),
        this.getSetting('netgsm_password'),
        this.getSetting('netgsm_header')
      ]);

      if (!username || !password) {
        console.warn('⚠️ Netgsm bilgileri eksik:', { username: !!username, password: !!password, header: !!header });
        return null;
      }

      return {
        username: username as string,
        password: password as string,
        msgheader: (header as string) || 'TEKLIF'
      };
    } catch (error) {
      console.error('❌ Netgsm config getirme hatası:', error);
      return null;
    }
  }
}

export const settingsAPI = new SettingsAPI();