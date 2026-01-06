import { useState, useEffect } from 'react';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  X,
  Music, 
  Gamepad2, 
  Book, 
  Dumbbell, 
  Camera, 
  Utensils,
  Plane,
  Palette,
  Users,
  Heart,
  Circle,
  Zap,
  Waves,
  Trophy,
  Target,
  Flower2,
  Activity,
  MapPin,
  Bike,
  Mountain,
  Film,
  Headphones,
  Theater,
  Guitar,
  Piano,
  Brush,
  Tent,
  Trees,
  Coffee,
  PenTool,
  ShoppingBag,
  Shirt,
  Laptop,
  Gamepad,
  Lightbulb,
  TrendingUp,
  Mic,
  HandHeart,
  Dog,
  Brain,
  Leaf,
  Sparkles
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import WarningToast from '@/components/WarningToast';
import ErrorToast from '@/components/ErrorToast';

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
  
  // Toast states
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // İlgi alanı iconları
  const getInterestIcon = (interestName: string) => {
    const iconProps = { size: 18, color: '#8B5CF6', strokeWidth: 2 };
    
    switch (interestName.toLowerCase()) {
      // Spor & Aktivite
      case 'futbol':
        return <Circle {...iconProps} />;
      case 'basketbol':
        return <Trophy {...iconProps} />;
      case 'yüzme':
        return <Waves {...iconProps} />;
      case 'voleybol':
        return <Target {...iconProps} />;
      case 'tenis':
        return <Target {...iconProps} />;
      case 'yoga':
        return <Flower2 {...iconProps} />;
      case 'fitness':
        return <Dumbbell {...iconProps} />;
      case 'koşu':
        return <Activity {...iconProps} />;
      case 'yürüyüş':
        return <Activity {...iconProps} />;
      case 'bisiklet':
        return <Bike {...iconProps} />;
      case 'dağcılık':
        return <Mountain {...iconProps} />;
      case 'spor':
        return <Activity {...iconProps} />;
      
      // Sanat & Müzik & Eğlence
      case 'sinema':
        return <Film {...iconProps} />;
      case 'müzik':
        return <Music {...iconProps} />;
      case 'dans':
        return <Users {...iconProps} />;
      case 'tiyatro':
        return <Theater {...iconProps} />;
      case 'konser':
        return <Headphones {...iconProps} />;
      case 'gitar':
        return <Guitar {...iconProps} />;
      case 'piyano':
        return <Piano {...iconProps} />;
      case 'resim':
        return <Brush {...iconProps} />;
      case 'fotoğrafçılık':
        return <Camera {...iconProps} />;
      case 'eğlence':
        return <Sparkles {...iconProps} />;
      case 'kültür':
        return <Book {...iconProps} />;
      
      // Yaşam Tarzı
      case 'seyahat':
        return <Plane {...iconProps} />;
      case 'kamp':
        return <Tent {...iconProps} />;
      case 'doğa':
        return <Trees {...iconProps} />;
      case 'yemek':
        return <Utensils {...iconProps} />;
      case 'kahve':
        return <Coffee {...iconProps} />;
      case 'içecek':
        return <Coffee {...iconProps} />;
      case 'kitap':
        return <Book {...iconProps} />;
      case 'alışveriş':
        return <ShoppingBag {...iconProps} />;
      
      // Teknoloji & Oyun
      case 'teknoloji':
        return <Laptop {...iconProps} />;
      case 'oyun':
        return <Gamepad2 {...iconProps} />;
      case 'girişimcilik':
        return <Lightbulb {...iconProps} />;
      case 'satranç':
        return <Target {...iconProps} />;
      case 'okey':
        return <Users {...iconProps} />;
      case 'tavla':
        return <Circle {...iconProps} />;
      
      // Sosyal & Diğer
      case 'hayvanlar':
        return <Dog {...iconProps} />;
      case 'bahçecilik':
        return <Leaf {...iconProps} />;
      
      default:
        return <Heart {...iconProps} />;
    }
  };

  useEffect(() => {
    loadInterests();
  }, []);

  const loadInterests = async () => {
    const { data, error } = await supabase.from('interests').select('*').order('name');
    if (data) setInterests(data);
  };

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      triggerHaptic();
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else {
      if (selectedInterests.length >= 5) {
        setWarningMessage('En fazla 5 ilgi alanı seçebilirsiniz');
        setShowWarningToast(true);
        return;
      }
      triggerHaptic();
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const removeInterest = (id: string) => {
    triggerHaptic();
    setSelectedInterests(selectedInterests.filter(i => i !== id));
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      setWarningMessage('Lütfen en az 3 ilgi alanı seçin');
      setShowWarningToast(true);
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
      router.push('/onboarding/location');
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
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
          <Text style={styles.stepIndicator}>Adım 5/7</Text>
          <Text style={styles.title}>İlgi alanlarınız</Text>
          <Text style={styles.subtitle}>
            En az 3, en fazla 5 seçin ({selectedInterests.length}/5)
          </Text>
        </View>

        {/* Seçilen İlgi Alanları */}
        {selectedInterests.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>Seçilen İlgi Alanları</Text>
            <View style={styles.selectedGrid}>
              {selectedInterests.map(interestId => {
                const interest = interests.find(i => i.id === interestId);
                if (!interest) return null;
                
                return (
                  <View key={interest.id} style={styles.selectedChip}>
                    <View style={styles.selectedContent}>
                      <View style={styles.selectedIconContainer}>
                        {React.cloneElement(getInterestIcon(interest.name), { 
                          color: '#8B5CF6', 
                          size: 14 
                        })}
                      </View>
                      <Text style={styles.selectedText}>{interest.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeInterest(interest.id)}
                      style={styles.removeButton}
                      activeOpacity={0.7}
                    >
                      <X size={12} color="#8B5CF6" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.interestsGrid}>
            {interests.map(interest => (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.interestChip,
                  selectedInterests.includes(interest.id) && styles.interestChipSelected,
                ]}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.8}
              >
                <View style={styles.interestContent}>
                  {React.cloneElement(getInterestIcon(interest.name), { 
                    color: selectedInterests.includes(interest.id) ? '#FFF' : '#8B5CF6',
                    size: 16 
                  })}
                  <Text
                    style={[
                      styles.interestText,
                      selectedInterests.includes(interest.id) && styles.interestTextSelected,
                    ]}
                  >
                    {interest.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    marginBottom: 20,
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
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectedSection: {
    backgroundColor: '#F9F5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedIconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 2,
    justifyContent: 'space-between',
  },
  interestChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    width: '48%',
    alignItems: 'center',
    marginBottom: 4,
  },
  interestChipSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  interestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
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
