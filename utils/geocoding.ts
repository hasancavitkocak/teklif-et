// Geocoding utility - Şehir adından koordinat al
import * as Location from 'expo-location';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Şehir adından koordinat al (Expo Location Geocoding)
 * @param cityName - Şehir adı (örn: "Kadıköy, İstanbul" veya "İstanbul")
 * @returns Koordinatlar veya null
 */
export async function geocodeCity(cityName: string): Promise<Coordinates | null> {
  try {
    console.log('🔍 Geocoding:', cityName);
    
    // Expo Location ile geocoding
    const results = await Location.geocodeAsync(cityName + ', Turkey');
    
    if (results && results.length > 0) {
      const { latitude, longitude } = results[0];
      console.log('✅ Koordinat bulundu:', { latitude, longitude });
      return { latitude, longitude };
    }
    
    console.warn('⚠️ Koordinat bulunamadı:', cityName);
    return null;
  } catch (error) {
    console.error('❌ Geocoding hatası:', error);
    return null;
  }
}

/**
 * Koordinattan şehir adı al (Reverse Geocoding)
 * @param latitude - Enlem
 * @param longitude - Boylam
 * @returns Şehir adı veya null
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    
    if (results && results.length > 0) {
      const result = results[0];
      
      // İlçe bilgisini akıllı şekilde belirle
      let cityName = '';
      let districtName = '';
      let regionName = result.region || '';
      
      // Önce district alanını kontrol et ve mapping uygula
      if (result.district) {
        districtName = getDistrictFromNeighborhood(result.district);
      }
      // Sonra subregion'ı kontrol et
      else if (result.subregion) {
        districtName = getDistrictFromNeighborhood(result.subregion);
      }
      // Son çare olarak city'yi kullan
      else if (result.city) {
        districtName = result.city;
      }
      
      // Final şehir adını oluştur
      if (districtName && regionName) {
        cityName = `${districtName}, ${regionName}`;
      } else if (districtName) {
        cityName = districtName;
      } else if (regionName) {
        cityName = regionName;
      }
      
      return cityName || null;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
