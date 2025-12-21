interface OtpData {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number; // Son gönderim zamanı
}

class OtpCache {
  private cache = new Map<string, OtpData>();
  private readonly EXPIRY_TIME = 5 * 60 * 1000; // 5 dakika
  private readonly MAX_ATTEMPTS = 3;
  private readonly MIN_RESEND_INTERVAL = 60 * 1000; // 1 dakika

  setOtp(phone: string, code: string): void {
    const now = Date.now();
    const expiresAt = now + this.EXPIRY_TIME;
    // Code'u string olarak kaydet
    const codeStr = String(code);
    console.log('📝 OTP cache\'e kaydediliyor:', { phone, code: codeStr, expiresAt });
    this.cache.set(phone, {
      code: codeStr,
      expiresAt,
      attempts: 0,
      lastSentAt: now
    });

    // Otomatik temizlik
    setTimeout(() => {
      this.cache.delete(phone);
    }, this.EXPIRY_TIME);
  }

  verifyOtp(phone: string, inputCode: string): { success: boolean; error?: string } {
    const inputCodeStr = String(inputCode);
    console.log('🔍 OTP doğrulama:', { phone, inputCode: inputCodeStr });
    const otpData = this.cache.get(phone);
    console.log('📋 Cache\'deki OTP data:', otpData);

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

    if (otpData.code !== inputCodeStr) {
      otpData.attempts++;
      console.log('❌ OTP kodu eşleşmiyor:', { expected: otpData.code, received: inputCodeStr, expectedType: typeof otpData.code, receivedType: typeof inputCodeStr });
      return { success: false, error: 'Geçersiz OTP kodu' };
    }

    // Başarılı doğrulama
    this.cache.delete(phone);
    console.log('✅ OTP doğrulama başarılı');
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

  // Yeniden gönderim için kalan süreyi kontrol et
  canResendOtp(phone: string): { canResend: boolean; remainingSeconds?: number } {
    const otpData = this.cache.get(phone);
    if (!otpData) return { canResend: true };
    
    const timeSinceLastSent = Date.now() - otpData.lastSentAt;
    if (timeSinceLastSent < this.MIN_RESEND_INTERVAL) {
      const remainingMs = this.MIN_RESEND_INTERVAL - timeSinceLastSent;
      return { 
        canResend: false, 
        remainingSeconds: Math.ceil(remainingMs / 1000) 
      };
    }
    
    return { canResend: true };
  }
}

export const otpCache = new OtpCache();