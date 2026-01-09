import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import InfoToast from '@/components/InfoToast';
import ErrorToast from '@/components/ErrorToast';
import { SmsRetrieverService } from '@/utils/smsRetriever';
import { settingsAPI } from '@/api/settings';

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, transactionId } = useLocalSearchParams<{ phone: string; transactionId?: string }>();
  const { verifyOtp, verifyOtpWithPremiumCheck, resendOtp } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60); // 60 saniye geri sayım
  const [canResend, setCanResend] = useState(false);
  const [smsRetrieverActive, setSmsRetrieverActive] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoCode, setDemoCode] = useState('123456');
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Toast states
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // SMS mode kontrolü
  useEffect(() => {
    checkSmsMode();
  }, []);

  const checkSmsMode = async () => {
    try {
      const smsEnabled = await settingsAPI.isSmsEnabled();
      const code = await settingsAPI.getDemoOtpCode();
      setIsDemoMode(!smsEnabled);
      setDemoCode(code);
      console.log('📱 Verify sayfası - SMS Mode:', smsEnabled ? 'Production' : 'Development');
      console.log('📱 Verify sayfası - Demo kod:', code);
    } catch (error) {
      console.error('❌ SMS mode kontrol hatası:', error);
      setIsDemoMode(true); // Hata durumunda demo mode
      setDemoCode('123456'); // Fallback kod
    }
  };

  // SMS Retriever başlat (sadece Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      startSmsRetriever();
    }

    // Cleanup
    return () => {
      SmsRetrieverService.stopSmsListener();
    };
  }, []);

  const startSmsRetriever = async () => {
    try {
      const success = await SmsRetrieverService.startSmsListener(
        (code) => {
          console.log('📱 Otomatik SMS kodu alındı:', code);
          // Kodu otomatik doldur
          const newOtp = code.split('');
          setOtp(newOtp);
          setSmsRetrieverActive(false);
          
          // Otomatik doğrulama yap
          setTimeout(() => {
            verifyCode(code);
          }, 500);
        },
        (error) => {
          console.error('❌ SMS Retriever hatası:', error);
          setSmsRetrieverActive(false);
        }
      );

      if (success) {
        setSmsRetrieverActive(true);
        // SMS otomatik okunacak mesajını kaldırdık
      }
    } catch (error) {
      console.error('❌ SMS Retriever başlatma hatası:', error);
    }
  };
  // Geri sayım timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      await resendOtp(phone);
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']); // Kodu temizle
      inputRefs.current[0]?.focus(); // İlk input'a odaklan
      setInfoMessage('Doğrulama kodu tekrar gönderildi');
      setShowInfoToast(true);

      // SMS Retriever'ı yeniden başlat
      if (Platform.OS === 'android') {
        startSmsRetriever();
      }
    } catch (error: any) {
      // SMS gönderim sınırlaması hatası için özel mesaj
      if (error.message.includes('saniye bekleyin')) {
        setErrorMessage(`SMS gönderim sınırı: ${error.message}`);
      } else {
        setErrorMessage(error.message || 'Kod gönderilemedi, lütfen tekrar deneyin');
      }
      setShowErrorToast(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '')) {
      verifyCode(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (code: string) => {
    console.log('🔐 Verifying code:', code, 'for phone:', phone);
    if (transactionId) {
      console.log('🔍 Transaction ID provided:', transactionId.substring(0, 20) + '...');
    }
    
    setLoading(true);
    try {
      let success = false;
      
      // Eğer transaction ID varsa premium kontrolü ile doğrula
      if (transactionId) {
        success = await verifyOtpWithPremiumCheck(phone, code, transactionId);
      } else {
        success = await verifyOtp(phone, code);
      }
      
      console.log('✅ Verify result:', success);
      if (success) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', session.session.user.id)
            .maybeSingle();

          if (profile?.onboarding_completed) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding/name');
          }
        } else {
          router.replace('/onboarding/name');
        }
      }
    } catch (error: any) {
      console.log('❌ Verify error:', error.message);
      // Daha spesifik hata mesajları
      if (error.message.includes('Geçersiz OTP kodu')) {
        setErrorMessage('Doğrulama kodu hatalı. Lütfen tekrar deneyin.');
      } else if (error.message.includes('OTP bulunamadı')) {
        setErrorMessage('Doğrulama kodu bulunamadı. Yeni kod isteyin.');
      } else if (error.message.includes('OTP süresi doldu')) {
        setErrorMessage('Doğrulama kodunun süresi doldu. Yeni kod isteyin.');
      } else if (error.message.includes('Çok fazla hatalı deneme')) {
        setErrorMessage('Çok fazla hatalı deneme. Yeni kod isteyin.');
      } else {
        setErrorMessage('Doğrulama kodu hatalı');
      }
      setShowErrorToast(true);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Doğrulama Kodu</Text>
          <Text style={styles.subtitle}>
            {phone} numarasına gönderilen{'\n'}6 haneli kodu girin
          </Text>
          {isDemoMode && (
            <Text style={styles.hint}>Test için: {demoCode}</Text>
          )}
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputRefs.current[index] = ref)}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.resendContainer}>
          {!canResend ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                Kodu tekrar gönderebilmek için {formatTime(countdown)} bekleyin
              </Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendCode}
            >
              <Text style={styles.resendText}>Kodu Tekrar Gönder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Toast */}
      <InfoToast
        visible={showInfoToast}
        message={infoMessage}
        onHide={() => setShowInfoToast(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  titleContainer: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    fontWeight: '400',
  },
  hint: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 12,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 64,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  otpInputFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  resendContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  countdownText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
