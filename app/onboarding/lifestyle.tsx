import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert ,  Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function LifestyleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [smoking, setSmoking] = useState<string | null>(null);
  const [drinking, setDrinking] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = async () => {
    if (smoking === null || drinking === null) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm seçenekleri işaretleyin');
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          smoking,
          drinking,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      router.push('/onboarding/location');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '70%' }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Yaşam tarzınız</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sigara içiyor musunuz?</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.optionButton, smoking === 'regularly' && styles.optionButtonSelected]}
              onPress={() => {
                triggerHaptic();
                setSmoking('regularly');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionText, smoking === 'regularly' && styles.optionTextSelected]}
              >
                Evet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, smoking === 'never' && styles.optionButtonSelected]}
              onPress={() => {
                triggerHaptic();
                setSmoking('never');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionText, smoking === 'never' && styles.optionTextSelected]}
              >
                Hayır
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alkol kullanıyor musunuz?</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[styles.optionButton, drinking === 'regularly' && styles.optionButtonSelected]}
              onPress={() => {
                triggerHaptic();
                setDrinking('regularly');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionText, drinking === 'regularly' && styles.optionTextSelected]}
              >
                Evet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, drinking === 'never' && styles.optionButtonSelected]}
              onPress={() => {
                triggerHaptic();
                setDrinking('never');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.optionText, drinking === 'never' && styles.optionTextSelected]}
              >
                Hayır
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (smoking === null || drinking === null || loading) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={smoking === null || drinking === null || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Devam Et</Text>
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
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    marginTop: 60,
  },
  progress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  optionButtonSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
});
