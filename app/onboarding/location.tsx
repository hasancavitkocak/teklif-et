import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';

export default function LocationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    try {
      setDetectingLocation(true);

      const Location = require('expo-location');
      
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli', 
          'Konumunuzu tespit etmek için konum iznine ihtiyacımız var.',
          [{ text: 'Tamam', onPress: () => router.back() }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const results = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (results && results.length > 0) {
        const result = results[0];
        
        console.log('🗺️ Onboarding Geocode sonucu:', {
          district: result.district,
          subregion: result.subregion,
          city: result.city,
          region: result.region
        });
        
        // İlçe bilgisini akıllı şekilde belirle
        let detectedCity = '';
        let districtName = '';
        let regionName = result.region || '';
        
        // Önce district alanını kontrol et ve mapping uygula
        if (result.district) {
          districtName = getDistrictFromNeighborhood(result.district);
          console.log('🔄 Onboarding District mapping:', result.district, '->', districtName);
        }
        // Sonra subregion'ı kontrol et
        else if (result.subregion) {
          districtName = getDistrictFromNeighborhood(result.subregion);
          console.log('🔄 Onboarding Subregion mapping:', result.subregion, '->', districtName);
        }
        // Son çare olarak city'yi kullan
        else if (result.city) {
          districtName = result.city;
          console.log('🔄 Onboarding City kullanıldı:', districtName);
        }
        
        // Final şehir adını oluştur
        if (districtName && regionName) {
          detectedCity = `${districtName}, ${regionName}`;
          console.log('📍 Onboarding Final konum:', detectedCity);
        } else if (districtName) {
          detectedCity = districtName;
        } else if (regionName) {
          detectedCity = regionName;
        }
        
        if (detectedCity) {
          setCity(detectedCity);
          triggerHaptic();
        } else {
          Alert.alert(
            'Hata', 
            'Şehir bilgisi bulunamadı.',
            [{ text: 'Tamam', onPress: () => router.back() }]
          );
        }
      } else {
        Alert.alert(
          'Hata', 
          'Konum bilgisi alınamadı.',
          [{ text: 'Tamam', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert(
        'Hata', 
        'Konumunuz tespit edilemedi.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleContinue = async () => {
    if (!city.trim()) {
      Alert.alert('Eksik Bilgi', 'Konum tespit edilemedi');
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      // Koordinatları da kaydet
      const Location = require('expo-location');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { error } = await supabase
        .from('profiles')
        .update({
          city: city.trim(),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      router.push('/onboarding/photos');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.loadingText}>Konumunuz tespit ediliyor...</Text>
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

        <TouchableOpacity
          style={[styles.button, (!city.trim() || loading || detectingLocation) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!city.trim() || loading || detectingLocation}
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
