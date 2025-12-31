import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import WarningToast from '@/components/WarningToast';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';

export default function NameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Toast states
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleInfoPress = () => {
    triggerHaptic();
    setInfoMessage('Adınız sonradan değiştirilemez. Gerçek adınızı girin.');
    setShowInfoToast(true);
  };

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      setWarningMessage('Lütfen adınızı girin');
      setShowWarningToast(true);
      return;
    }

    triggerHaptic();
    setLoading(true);

    try {
      // İsmi kaydet
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .maybeSingle();

      // Telefon numarasını user metadata'dan al
      const phone = user?.user_metadata?.phone || null;

      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            phone: phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          id: user?.id,
          name: name.trim(),
          phone: phone,
          birth_date: '2000-01-01',
          gender: 'male',
          drinking: 'occasionally',
          smoking: 'never',
          exercise: 'sometimes',
        });

        if (error) throw error;
      }

      // Yaşınız sayfasına git (popup orada açılacak)
      router.push('/onboarding/birthdate');
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '14%' }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.stepIndicator}>Adım 1/7</Text>
          <Text style={styles.title}>Adınız nedir?</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>Profilinizde görünecek</Text>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={handleInfoPress}
              activeOpacity={0.7}
            >
              <Info size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Adınızı girin"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={30}
        />

        <TouchableOpacity
          style={[styles.button, (!name.trim() || loading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!name.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Kaydediliyor...' : 'Devam Et'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Toast */}
      <InfoToast
        visible={showInfoToast}
        message={infoMessage}
        onHide={() => setShowInfoToast(false)}
      />

      {/* Warning Toast */}
      <WarningToast
        visible={showWarningToast}
        message={warningMessage}
        onHide={() => setShowWarningToast(false)}
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
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    marginTop: 60,
  },
  progress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  titleContainer: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },
  infoButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 17,
    fontWeight: '500',
    color: '#111827',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
