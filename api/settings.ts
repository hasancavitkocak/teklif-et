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
}

export const settingsAPI = new SettingsAPI();