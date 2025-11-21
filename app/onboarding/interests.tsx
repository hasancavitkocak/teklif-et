import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView ,  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

interface Interest {
  id: string;
  name: string;
  category: string;
}

export default function InterestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    const { data, error } = await supabase.from('interests').select('*').order('category');
    if (data) setInterests(data);
  };

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      triggerHaptic();
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else {
      if (selectedInterests.length >= 5) {
        Alert.alert('Maksimum Seçim', 'En fazla 5 ilgi alanı seçebilirsiniz');
        return;
      }
      triggerHaptic();
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az 3 ilgi alanı seçin');
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      await supabase.from('user_interests').delete().eq('user_id', user?.id);

      const insertData = selectedInterests.map(interestId => ({
        user_id: user?.id,
        interest_id: interestId,
      }));

      const { error } = await supabase.from('user_interests').insert(insertData);

      if (error) throw error;
      router.push('/onboarding/lifestyle');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedInterests = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = [];
    }
    acc[interest.category].push(interest);
    return acc;
  }, {} as Record<string, Interest[]>);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '56%' }]} />
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
          <Text style={styles.stepIndicator}>Adım 4/7</Text>
          <Text style={styles.title}>İlgi alanlarınız</Text>
          <Text style={styles.subtitle}>
            En az 3, en fazla 5 seçin ({selectedInterests.length}/5)
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedInterests).map(([category, categoryInterests]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.interestsGrid}>
                {categoryInterests.map(interest => (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.interestChip,
                      selectedInterests.includes(interest.id) && styles.interestChipSelected,
                    ]}
                    onPress={() => toggleInterest(interest.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.interestText,
                        selectedInterests.includes(interest.id) && styles.interestTextSelected,
                      ]}
                    >
                      {interest.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.button,
            (selectedInterests.length < 3 || loading) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={selectedInterests.length < 3 || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Devam Et</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    marginBottom: 24,
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
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 28,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 14,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  interestChipSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
  },
  interestText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  interestTextSelected: {
    color: '#FFF',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
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
