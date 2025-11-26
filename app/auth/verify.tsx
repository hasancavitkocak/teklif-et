import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

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
    setLoading(true);
    try {
      const success = await verifyOtp(phone, code);
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
      Alert.alert('Hata', 'Doğrulama kodu hatalı');
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
          <Text style={styles.hint}>Test için: 123456</Text>
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

        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Kodu Tekrar Gönder</Text>
        </TouchableOpacity>
      </View>
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
  resendButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
