// Geocoding utility - Şehir adından koordinat al
import * as Location from 'expo-location';

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
      const city = result.city || result.district || result.subregion;
      const region = result.region;
      
      if (city && region) {
        return `${city}, ${region}`;
      } else if (city) {
        return city;
      } else if (region) {
        return region;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
