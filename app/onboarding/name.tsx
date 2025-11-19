import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert ,  Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function NameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Eksik Bilgi', 'Lütfen adınızı girin');
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          id: user?.id,
          name: name.trim(),
          birth_date: '2000-01-01',
          gender: 'male',
          drinking: 'occasionally',
          smoking: 'never',
          exercise: 'sometimes',
        });

        if (error) throw error;
      }

      router.push('/onboarding/birthdate');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
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
        <View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Adınız nedir?</Text>
            <Text style={styles.subtitle}>Profilinizde görünecek</Text>
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
        </View>

        <TouchableOpacity
          style={[styles.button, (!name.trim() || loading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!name.trim() || loading}
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
    justifyContent: 'space-between',
  },
  titleContainer: {
    marginBottom: 28,
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
    fontWeight: '400',
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
    marginBottom: 20,
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
