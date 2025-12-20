interface NetgsmConfig {
  username: string;
  password: string;
  msgheader: string;
}

interface SendSmsParams {
  phone: string;
  message: string;
  config: NetgsmConfig;
}

interface SendSmsResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

export class NetgsmSmsService {
  private static readonly BASE_URL = 'https://api.netgsm.com.tr/sms/rest/v2/send';

  // Base64 encode polyfill for React Native
  private static base64Encode(str: string): string {
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    
    // React Native polyfill
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  static async sendSms({ phone, message, config }: SendSmsParams): Promise<SendSmsResponse> {
    try {
      // Telefon numarasını temizle (+ ve boşlukları kaldır)
      const cleanPhone = phone.replace(/[\+\s\-\(\)]/g, '');
      
      // Türkiye numarası için 90 ile başlıyorsa, 0 ile değiştir
      let formattedPhone = cleanPhone;
      if (cleanPhone.startsWith('90')) {
        formattedPhone = '0' + cleanPhone.substring(2);
      }

      // REST API v2 için JSON payload
      const payload = {
        msgheader: config.msgheader,
        messages: [
          {
            msg: message,
            no: formattedPhone
          }
        ],
        encoding: 'TR', // Türkçe karakter desteği
        iysfilter: '0', // Bilgilendirme amaçlı
        partnercode: ''
      };

      // Basic Auth için credentials
      const credentials = this.base64Encode(`${config.username}:${config.password}`);

      console.log('📱 Netgsm REST v2 SMS gönderiliyor:', {
        phone: formattedPhone,
        message,
        header: config.msgheader
      });

      const response = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('📱 Netgsm REST v2 yanıtı:', responseData);

      // Başarılı yanıt kontrolü
      if (responseData.code === '00' && responseData.jobid) {
        return {
          success: true,
          jobId: responseData.jobid
        };
      } else {
        // Hata durumu
        const errorMessage = this.getErrorMessage(responseData.code) || responseData.description || 'SMS gönderim hatası';
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('❌ Netgsm REST v2 SMS hatası:', error);
      return {
        success: false,
        error: 'SMS gönderim hatası'
      };
    }
  }

  private static getErrorMessage(code: string): string {
    const errorCodes: { [key: string]: string } = {
      '01': 'Mesaj gönderim başlangıç tarihinde hata var',
      '02': 'Mesaj gönderim sonlandırılma tarihinde hata var',
      '20': 'Mesaj metninde hata var',
      '30': 'Geçersiz kullanıcı adı, şifre',
      '40': 'Mesaj başlığı (header) kayıtlı değil',
      '70': 'Hatalı sorgulama',
      '80': 'Mesaj gönderim limitine ulaşıldı',
      '85': 'Mesaj gönderim limitine ulaşıldı',
    };

    return errorCodes[code] || `Bilinmeyen hata: ${code}`;
  }

  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}