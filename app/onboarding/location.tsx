import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export default function LocationScreen() {
  const router = useRouter();
  const { user, requestLocationPermission, updateLocationManually } = useAuth();
  const [city, setCity] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    detectLocationWithRetry();
  }, []);

  const detectLocationWithRetry = async (attempt = 1) => {
    console.log(`📍 Onboarding konum tespiti denemesi ${attempt}/3`);
    
    try {
      setDetectingLocation(true);
      setRetryCount(attempt);

      // Konum izni iste
      const permissionResult = await requestLocationPermission();
      
      if (!permissionResult.granted) {
        console.log('❌ Onboarding konum izni reddedildi');
        setTimeout(async () => {
          detectLocationWithRetry(1);
        }, 2000);
        return;
      }

      // AuthContext'teki updateLocationManually fonksiyonunu kullan
      console.log('🔄 Onboarding AuthContext üzerinden konum güncelleniyor...');
      const locationResult = await updateLocationManually();
      
      if (locationResult.success && locationResult.city) {
        console.log('✅ Onboarding konum başarıyla alındı:', locationResult.city);
        setCity(locationResult.city);
        triggerHaptic();
        setDetectingLocation(false);
      } else if (locationResult.error === 'permission_denied') {
        setTimeout(() => {
          detectLocationWithRetry(1);
        }, 2000);
        return;
      } else {
        throw new Error('Konum tespit edilemedi');
      }
      
    } catch (error: any) {
      console.error(`❌ Onboarding konum tespiti hatası (deneme ${attempt}):`, error);
      
      if (attempt < 3) {
        setTimeout(() => {
          detectLocationWithRetry(attempt + 1);
        }, 1000);
        return;
      }
      
      // 3 deneme de başarısız
      setDetectingLocation(false);
      Alert.alert(
        'Konum Tespiti Başarısız', 
        'Konumunuz tespit edilemedi. Manuel olarak devam etmek ister misiniz?',
        [
          { text: 'Geri Dön', onPress: () => router.back() },
          { 
            text: 'Manuel Devam', 
            onPress: async () => {
              setCity('Manuel konum');
              setDetectingLocation(false);
            }
          }
        ]
      );
    }
  };



  const handleContinue = () => {
    if (!city.trim()) {
      Alert.alert('Hata', 'Konum tespit edilemedi');
      return;
    }
    
    console.log('✅ Onboarding konum ile devam ediliyor:', city);
    triggerHaptic();
    router.push('/onboarding/photos');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '84%' }]} />
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
        <View>
          <View style={styles.titleContainer}>
            <Text style={styles.stepIndicator}>Adım 6/7</Text>
            <Text style={styles.title}>Neredesiniz?</Text>
            <Text style={styles.subtitle}>Konumunuz otomatik tespit ediliyor</Text>
          </View>

          {detectingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>
                Konumunuz tespit ediliyor... ({retryCount}/3)
              </Text>
              <Text style={styles.loadingSubtext}>Tespit edilince devam edebilirsiniz</Text>
            </View>
          ) : (
            <View style={styles.locationContainer}>
              <View style={styles.locationCard}>
                <View style={styles.locationIcon}>
                  <MapPin size={24} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Tespit Edilen Konum</Text>
                  <Text style={styles.locationText}>{city}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {!detectingLocation && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Devam Et</Text>
          </TouchableOpacity>
        )}
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
    paddingBottom: 20,
    justifyContent: 'space-between',
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 16,
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  locationContainer: {
    paddingVertical: 20,
  },
  locationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  locationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
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
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
});