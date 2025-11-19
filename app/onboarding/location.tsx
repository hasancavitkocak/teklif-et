import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Navigation } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const TURKISH_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Şanlıurfa', 'Mersin', 'Kocaeli', 'Diyarbakır', 'Hatay', 'Manisa', 'Kayseri',
  'Samsun', 'Denizli', 'Eskişehir', 'Trabzon', 'Sakarya', 'Balıkesir', 'Malatya',
];

export default function LocationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const detectLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web\'de Konum Tespiti',
        'Web tarayıcısında konum tespiti şu anda desteklenmiyor. Lütfen şehrinizi manuel olarak seçin.'
      );
      return;
    }

    try {
      setDetectingLocation(true);
      triggerHaptic();

      const Location = require('expo-location');
      console.log('Requesting location permission...');

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);

      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konumunuzu tespit etmek için konum iznine ihtiyacımız var.');
        setDetectingLocation(false);
        return;
      }

      console.log('Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      console.log('Location:', location);

      console.log('Reverse geocoding...');
      const results = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('Geocode results:', results);

      if (results && results.length > 0) {
        const result = results[0];
        if (result.city) {
          setCity(result.city);
          triggerHaptic();
          Alert.alert('Başarılı', `Konumunuz tespit edildi: ${result.city}`);
        } else if (result.region) {
          setCity(result.region);
          triggerHaptic();
          Alert.alert('Başarılı', `Konumunuz tespit edildi: ${result.region}`);
        } else {
          Alert.alert('Hata', 'Şehir bilgisi bulunamadı. Lütfen manuel olarak seçin.');
        }
      } else {
        Alert.alert('Hata', 'Konum bilgisi alınamadı. Lütfen manuel olarak seçin.');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert('Hata', `Konumunuz tespit edilemedi: ${error.message}. Lütfen manuel olarak seçin.`);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleContinue = async () => {
    if (!city.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen şehrinizi seçin veya girin');
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          city: city.trim(),
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

  const filteredCities = TURKISH_CITIES.filter(c =>
    c.toLowerCase().includes(city.toLowerCase()) || !city
  ).slice(0, 12);

  return (
    <View style={styles.container}>
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
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Neredesiniz?</Text>
          <Text style={styles.subtitle}>Şehrinizi seçin veya tespit edin</Text>
        </View>

        <TouchableOpacity
          style={styles.detectButton}
          onPress={detectLocation}
          disabled={detectingLocation}
          activeOpacity={0.8}
        >
          <View style={styles.detectButtonIcon}>
            <Navigation size={20} color="#8B5CF6" strokeWidth={2.5} />
          </View>
          <Text style={styles.detectButtonText}>
            {detectingLocation ? 'Konum tespit ediliyor...' : 'Konumumu Tespit Et'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputContainer}>
          <MapPin size={20} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.input}
            placeholder="Şehir ara..."
            placeholderTextColor="#C7C7CC"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.citiesContainer}>
          {filteredCities.map(cityName => (
            <TouchableOpacity
              key={cityName}
              style={[
                styles.cityChip,
                city === cityName && styles.cityChipSelected,
              ]}
              onPress={() => {
                triggerHaptic();
                setCity(cityName);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.cityText,
                  city === cityName && styles.cityTextSelected,
                ]}
              >
                {cityName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, (!city.trim() || loading) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!city.trim() || loading}
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
    marginBottom: 24,
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
  detectButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  detectButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8B5CF6',
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#111827',
  },
  citiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  cityChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cityChipSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
  },
  cityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cityTextSelected: {
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
