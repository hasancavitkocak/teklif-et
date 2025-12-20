interface OtpData {
  code: string;
  expiresAt: number;
  attempts: number;
}

class OtpCache {
  private cache = new Map<string, OtpData>();
  private readonly EXPIRY_TIME = 5 * 60 * 1000; // 5 dakika
  private readonly MAX_ATTEMPTS = 3;

  setOtp(phone: string, code: string): void {
    const expiresAt = Date.now() + this.EXPIRY_TIME;
    this.cache.set(phone, {
      code,
      expiresAt,
      attempts: 0
    });

    // Otomatik temizlik
    setTimeout(() => {
      this.cache.delete(phone);
    }, this.EXPIRY_TIME);
  }

  verifyOtp(phone: string, inputCode: string): { success: boolean; error?: string } {
    const otpData = this.cache.get(phone);

    if (!otpData) {
      return { success: false, error: 'OTP bulunamadı veya süresi doldu' };
    }

    if (Date.now() > otpData.expiresAt) {
      this.cache.delete(phone);
      return { success: false, error: 'OTP süresi doldu' };
    }

    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      this.cache.delete(phone);
      return { success: false, error: 'Çok fazla hatalı deneme' };
    }

    if (otpData.code !== inputCode) {
      otpData.attempts++;
      return { success: false, error: 'Geçersiz OTP kodu' };
    }

    // Başarılı doğrulama
    this.cache.delete(phone);
    return { success: true };
  }

  hasValidOtp(phone: string): boolean {
    const otpData = this.cache.get(phone);
    return otpData !== undefined && Date.now() <= otpData.expiresAt;
  }

  getRemainingTime(phone: string): number {
    const otpData = this.cache.get(phone);
    if (!otpData) return 0;
    
    const remaining = otpData.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

export const otpCache = new OtpCache();