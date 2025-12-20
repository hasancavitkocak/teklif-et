import { Platform } from 'react-native';

// SMS Retriever sadece Android'de çalışır
let SmsRetriever: any = null;
if (Platform.OS === 'android') {
  try {
    SmsRetriever = require('react-native-sms-retriever').default;
  } catch (error) {
    console.warn('SMS Retriever not available:', error);
  }
}

interface SmsRetrieverResult {
  success: boolean;
  code?: string;
  error?: string;
}

export class SmsRetrieverService {
  private static listener: any = null;

  /**
   * SMS Retriever'ı başlat ve SMS dinlemeye başla
   */
  static async startSmsRetriever(): Promise<{ success: boolean; hash?: string }> {
    if (Platform.OS !== 'android' || !SmsRetriever) {
      console.log('📱 SMS Retriever sadece Android\'de destekleniyor');
      return { success: false };
    }

    try {
      // SMS Retriever'ı başlat
      const result = await SmsRetriever.requestPhoneNumber();
      console.log('📱 SMS Retriever başlatıldı:', result);

      // App hash'ini al (SMS'te kullanılacak)
      const hash = await SmsRetriever.getAppHash();
      console.log('📱 App Hash:', hash);

      return { success: true, hash: hash[0] };
    } catch (error) {
      console.error('❌ SMS Retriever başlatma hatası:', error);
      return { success: false };
    }
  }

  /**
   * SMS dinlemeye başla
   */
  static async startSmsListener(
    onSmsReceived: (code: string) => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (Platform.OS !== 'android' || !SmsRetriever) {
      return false;
    }

    try {
      // Önceki listener'ı temizle
      this.stopSmsListener();

      // SMS dinlemeye başla
      await SmsRetriever.startSmsRetriever();

      // SMS event listener'ı ekle
      this.listener = SmsRetriever.addSmsListener((event: any) => {
        console.log('📱 SMS alındı:', event);

        if (event.message) {
          // SMS'ten OTP kodunu çıkar
          const code = this.extractOtpFromSms(event.message);
          if (code) {
            console.log('✅ OTP kodu çıkarıldı:', code);
            onSmsReceived(code);
          } else {
            console.warn('⚠️ SMS\'te OTP kodu bulunamadı');
          }
        }

        if (event.error) {
          console.error('❌ SMS Retriever hatası:', event.error);
          onError?.(event.error);
        }
      });

      console.log('📱 SMS listener başlatıldı');
      return true;
    } catch (error) {
      console.error('❌ SMS listener başlatma hatası:', error);
      onError?.('SMS listener başlatılamadı');
      return false;
    }
  }

  /**
   * SMS dinlemeyi durdur
   */
  static stopSmsListener(): void {
    if (this.listener) {
      try {
        SmsRetriever?.removeSmsListener(this.listener);
        this.listener = null;
        console.log('📱 SMS listener durduruldu');
      } catch (error) {
        console.error('❌ SMS listener durdurma hatası:', error);
      }
    }
  }

  /**
   * SMS metninden OTP kodunu çıkar
   */
  private static extractOtpFromSms(message: string): string | null {
    // Farklı OTP formatlarını dene
    const patterns = [
      /\b(\d{6})\b/g, // 6 haneli sayı
      /kod[:\s]*(\d{6})/gi, // "kod: 123456" formatı
      /doğrulama[:\s]*(\d{6})/gi, // "doğrulama: 123456" formatı
      /verification[:\s]*(\d{6})/gi, // "verification: 123456" formatı
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        // Sadece 6 haneli sayıları al
        const numbers = match.filter(m => /^\d{6}$/.test(m));
        if (numbers.length > 0) {
          return numbers[0];
        }
      }
    }

    return null;
  }

  /**
   * App hash'ini al (SMS'te kullanılmak üzere)
   */
  static async getAppHash(): Promise<string | null> {
    if (Platform.OS !== 'android' || !SmsRetriever) {
      return null;
    }

    try {
      const hashes = await SmsRetriever.getAppHash();
      return hashes && hashes.length > 0 ? hashes[0] : null;
    } catch (error) {
      console.error('❌ App hash alma hatası:', error);
      return null;
    }
  }
}