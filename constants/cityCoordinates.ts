// İlçe merkez koordinatları
// Format: 'İlçe, İl' -> { lat, lon }

export interface CityCoordinates {
  lat: number;
  lon: number;
}

export const CITY_COORDINATES: Record<string, CityCoordinates> = {
  // İstanbul
  'Kadıköy, İstanbul': { lat: 40.9833, lon: 29.0333 },
  'Beşiktaş, İstanbul': { lat: 41.0422, lon: 29.0078 },
  'Şişli, İstanbul': { lat: 41.0602, lon: 28.9870 },
  'Üsküdar, İstanbul': { lat: 41.0226, lon: 29.0100 },
  'Beyoğlu, İstanbul': { lat: 41.0370, lon: 28.9784 },
  'Fatih, İstanbul': { lat: 41.0192, lon: 28.9497 },
  'Bakırköy, İstanbul': { lat: 40.9833, lon: 28.8667 },
  'Maltepe, İstanbul': { lat: 40.9333, lon: 29.1333 },
  'Ümraniye, İstanbul': { lat: 41.0167, lon: 29.1167 },
  'Pendik, İstanbul': { lat: 40.8764, lon: 29.2333 },
  'Kartal, İstanbul': { lat: 40.9000, lon: 29.1833 },
  'Ataşehir, İstanbul': { lat: 40.9833, lon: 29.1167 },
  'Sarıyer, İstanbul': { lat: 41.1667, lon: 29.0500 },
  'Eyüpsultan, İstanbul': { lat: 41.0500, lon: 28.9333 },
  'Küçükçekmece, İstanbul': { lat: 41.0167, lon: 28.7833 },
  'Bahçelievler, İstanbul': { lat: 41.0000, lon: 28.8500 },
  'Gaziosmanpaşa, İstanbul': { lat: 41.0667, lon: 28.9167 },
  'Sultangazi, İstanbul': { lat: 41.1000, lon: 28.8667 },
  'Esenler, İstanbul': { lat: 41.0500, lon: 28.8833 },
  'Güngören, İstanbul': { lat: 41.0167, lon: 28.8667 },
  'Kağıthane, İstanbul': { lat: 41.0833, lon: 28.9833 },
  'Bayrampaşa, İstanbul': { lat: 41.0333, lon: 28.9167 },
  'Zeytinburnu, İstanbul': { lat: 41.0000, lon: 28.9000 },
  'Bağcılar, İstanbul': { lat: 41.0333, lon: 28.8500 },
  'Başakşehir, İstanbul': { lat: 41.0833, lon: 28.8000 },
  'Avcılar, İstanbul': { lat: 40.9833, lon: 28.7167 },
  'Büyükçekmece, İstanbul': { lat: 41.0167, lon: 28.5833 },
  'Çatalca, İstanbul': { lat: 41.1417, lon: 28.4611 },
  'Silivri, İstanbul': { lat: 41.0750, lon: 28.2467 },
  'Arnavutköy, İstanbul': { lat: 41.1833, lon: 28.7333 },
  'Çekmeköy, İstanbul': { lat: 41.0333, lon: 29.2000 },
  'Sancaktepe, İstanbul': { lat: 40.9833, lon: 29.2333 },
  'Sultanbeyli, İstanbul': { lat: 40.9667, lon: 29.2667 },
  'Tuzla, İstanbul': { lat: 40.8167, lon: 29.3000 },
  'Beykoz, İstanbul': { lat: 41.1333, lon: 29.1000 },
  'Şile, İstanbul': { lat: 41.1750, lon: 29.6167 },
  'Adalar, İstanbul': { lat: 40.8667, lon: 29.1167 },
  'Esenyurt, İstanbul': { lat: 41.0333, lon: 28.6667 },

  // Ankara
  'Çankaya, Ankara': { lat: 39.9167, lon: 32.8667 },
  'Keçiören, Ankara': { lat: 39.9833, lon: 32.8667 },
  'Yenimahalle, Ankara': { lat: 39.9833, lon: 32.7833 },
  'Mamak, Ankara': { lat: 39.9333, lon: 32.9167 },
  'Etimesgut, Ankara': { lat: 39.9167, lon: 32.6667 },
  'Sincan, Ankara': { lat: 39.9667, lon: 32.5833 },
  'Altındağ, Ankara': { lat: 39.9500, lon: 32.8833 },
  'Pursaklar, Ankara': { lat: 40.0333, lon: 32.9000 },
  'Gölbaşı, Ankara': { lat: 39.7833, lon: 32.8167 },
  'Polatlı, Ankara': { lat: 39.5833, lon: 32.1500 },

  // İzmir
  'Konak, İzmir': { lat: 38.4189, lon: 27.1287 },
  'Karşıyaka, İzmir': { lat: 38.4597, lon: 27.1089 },
  'Bornova, İzmir': { lat: 38.4622, lon: 27.2156 },
  'Buca, İzmir': { lat: 38.3833, lon: 27.1833 },
  'Çiğli, İzmir': { lat: 38.5000, lon: 27.0500 },
  'Gaziemir, İzmir': { lat: 38.3167, lon: 27.1333 },
  'Balçova, İzmir': { lat: 38.3833, lon: 27.0500 },
  'Bayraklı, İzmir': { lat: 38.4667, lon: 27.1667 },
  'Narlıdere, İzmir': { lat: 38.4000, lon: 27.0333 },
  'Karabağlar, İzmir': { lat: 38.3667, lon: 27.1333 },
  'Aliağa, İzmir': { lat: 38.8000, lon: 26.9667 },
  'Bergama, İzmir': { lat: 39.1167, lon: 27.1833 },
  'Menemen, İzmir': { lat: 38.6167, lon: 27.0667 },
  'Tire, İzmir': { lat: 38.0833, lon: 27.7333 },
  'Torbalı, İzmir': { lat: 38.1500, lon: 27.3667 },
  'Ödemiş, İzmir': { lat: 38.2333, lon: 27.9667 },
  'Urla, İzmir': { lat: 38.3167, lon: 26.7667 },
  'Çeşme, İzmir': { lat: 38.3167, lon: 26.3000 },
  'Foça, İzmir': { lat: 38.6667, lon: 26.7500 },
  'Kemalpaşa, İzmir': { lat: 38.4333, lon: 27.4167 },

  // Bursa
  'Osmangazi, Bursa': { lat: 40.1833, lon: 29.0667 },
  'Nilüfer, Bursa': { lat: 40.2000, lon: 28.9833 },
  'Yıldırım, Bursa': { lat: 40.1833, lon: 29.1167 },
  'Gemlik, Bursa': { lat: 40.4333, lon: 29.1500 },
  'İnegöl, Bursa': { lat: 40.0833, lon: 29.5167 },
  'Mudanya, Bursa': { lat: 40.3667, lon: 28.8833 },
  'Mustafakemalpaşa, Bursa': { lat: 40.0333, lon: 28.4000 },

  // Antalya
  'Muratpaşa, Antalya': { lat: 36.8833, lon: 30.7000 },
  'Kepez, Antalya': { lat: 36.9167, lon: 30.7167 },
  'Konyaaltı, Antalya': { lat: 36.8833, lon: 30.6333 },
  'Alanya, Antalya': { lat: 36.5500, lon: 32.0000 },
  'Manavgat, Antalya': { lat: 36.7833, lon: 31.4333 },
  'Serik, Antalya': { lat: 36.9167, lon: 31.1000 },
  'Aksu, Antalya': { lat: 36.9500, lon: 30.8333 },
  'Kaş, Antalya': { lat: 36.2000, lon: 29.6333 },
  'Kemer, Antalya': { lat: 36.6000, lon: 30.5667 },

  // Adana
  'Seyhan, Adana': { lat: 37.0000, lon: 35.3167 },
  'Yüreğir, Adana': { lat: 36.9167, lon: 35.3833 },
  'Çukurova, Adana': { lat: 37.0167, lon: 35.3667 },
  'Sarıçam, Adana': { lat: 37.0000, lon: 35.4333 },
  'Ceyhan, Adana': { lat: 37.0333, lon: 35.8167 },

  // Konya
  'Selçuklu, Konya': { lat: 37.8833, lon: 32.5000 },
  'Meram, Konya': { lat: 37.8667, lon: 32.4833 },
  'Karatay, Konya': { lat: 37.8833, lon: 32.5167 },

  // Gaziantep
  'Şahinbey, Gaziantep': { lat: 37.0667, lon: 37.3833 },
  'Şehitkamil, Gaziantep': { lat: 37.0500, lon: 37.3667 },
  'Nizip, Gaziantep': { lat: 37.0000, lon: 37.8000 },

  // Kocaeli
  'İzmit, Kocaeli': { lat: 40.7667, lon: 29.9167 },
  'Gebze, Kocaeli': { lat: 40.8000, lon: 29.4333 },
  'Körfez, Kocaeli': { lat: 40.7667, lon: 29.7500 },
  'Derince, Kocaeli': { lat: 40.7667, lon: 29.8333 },
  'Gölcük, Kocaeli': { lat: 40.7167, lon: 29.8167 },
  'Kandıra, Kocaeli': { lat: 41.0667, lon: 30.1500 },
  'Karamürsel, Kocaeli': { lat: 40.6833, lon: 29.6167 },
  'Kartepe, Kocaeli': { lat: 40.7500, lon: 30.0333 },
  'Başiskele, Kocaeli': { lat: 40.6667, lon: 29.8833 },
  'Çayırova, Kocaeli': { lat: 40.8167, lon: 29.3667 },
  'Darıca, Kocaeli': { lat: 40.7667, lon: 29.3667 },
  'Dilovası, Kocaeli': { lat: 40.7833, lon: 29.5333 },

  // Diğer büyük şehirler için temel koordinatlar
  // Gerektiğinde eklenebilir...
};

// Şehir adından koordinat al
export function getCityCoordinates(city: string): CityCoordinates | null {
  return CITY_COORDINATES[city] || null;
}

// İl ve ilçeden koordinat al
export function getDistrictCoordinates(district: string, province: string): CityCoordinates | null {
  const key = `${district}, ${province}`;
  return CITY_COORDINATES[key] || null;
}
