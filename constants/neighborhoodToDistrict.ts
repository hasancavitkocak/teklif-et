// Mahalle/Cadde adlarını gerçek ilçe adlarına çeviren mapping
// Bu liste İstanbul için temel mahalle-ilçe eşleştirmelerini içerir

export const NEIGHBORHOOD_TO_DISTRICT: Record<string, string> = {
  // Esenler İlçesi
  '15 Temmuz': 'Esenler',
  'Akşemsettin': 'Esenler',
  'Barbaros': 'Esenler',
  'Birlik': 'Esenler',
  'Çiftehavuzlar': 'Esenler',
  'Fatih': 'Esenler',
  'Fevzi Çakmak': 'Esenler',
  'Havaalanı': 'Esenler',
  'Kemer': 'Esenler',
  'Menderes': 'Esenler',
  'Mimar Sinan': 'Esenler',
  'Namık Kemal': 'Esenler',
  'Nine Hatun': 'Esenler',
  'Oruçreis': 'Esenler',
  'Tuna': 'Esenler',
  'Turgutreis': 'Esenler',
  'Yavuz Selim': 'Esenler',

  // Kadıköy İlçesi
  'Acıbadem': 'Kadıköy',
  'Bostancı': 'Kadıköy',
  'Caddebostan': 'Kadıköy',
  'Caferağa': 'Kadıköy',
  'Erenköy': 'Kadıköy',
  'Fenerbahçe': 'Kadıköy',
  'Fikirtepe': 'Kadıköy',
  'Göztepe': 'Kadıköy',
  'Hasanpaşa': 'Kadıköy',
  'İçerenköy': 'Kadıköy',
  'Koşuyolu': 'Kadıköy',
  'Kozyatağı': 'Kadıköy',
  'Moda': 'Kadıköy',
  'Rasimpaşa': 'Kadıköy',
  'Sahrayıcedit': 'Kadıköy',
  'Suadiye': 'Kadıköy',
  'Zühtüpaşa': 'Kadıköy',

  // Beşiktaş İlçesi
  'Abbasağa': 'Beşiktaş',
  'Arnavutköy': 'Beşiktaş',
  'Bebek': 'Beşiktaş',
  'Dikilitaş': 'Beşiktaş',
  'Etiler': 'Beşiktaş',
  'Gayrettepe': 'Beşiktaş',
  'Kuruçeşme': 'Beşiktaş',
  'Levent': 'Beşiktaş',
  'Nispetiye': 'Beşiktaş',
  'Ortaköy': 'Beşiktaş',
  'Sinanpaşa': 'Beşiktaş',
  'Ulus': 'Beşiktaş',
  'Vişnezade': 'Beşiktaş',

  // Şişli İlçesi
  'Bozkurt': 'Şişli',
  'Cumhuriyet': 'Şişli',
  'Elmadağ': 'Şişli',
  'Feriköy': 'Şişli',
  'Fulya': 'Şişli',
  'Halaskargazi': 'Şişli',
  'Harbiye': 'Şişli',
  'İnönü': 'Şişli',
  'Kaptanpaşa': 'Şişli',
  'Kuştepe': 'Şişli',
  'Mahmut Şevket Paşa': 'Şişli',
  'Mecidiyeköy': 'Şişli',
  'Merkez': 'Şişli',
  'Meşrutiyet': 'Şişli',
  'Nişantaşı': 'Şişli',
  'Okmeydanı': 'Şişli',
  'Osmanbey': 'Şişli',
  'Pangaltı': 'Şişli',
  'Teşvikiye': 'Şişli',

  // Üsküdar İlçesi
  'Ahmediye': 'Üsküdar',
  'Altunizade': 'Üsküdar',
  'Aziz Mahmut Hüdayi': 'Üsküdar',
  'Barbaros Hayrettin Paşa': 'Üsküdar',
  'Beylerbeyi': 'Üsküdar',
  'Bulgurlu': 'Üsküdar',
  'Burhaniye': 'Üsküdar',
  'Çengelköy': 'Üsküdar',
  'Güzeltepe': 'Üsküdar',
  'İcadiye': 'Üsküdar',
  'Kandilli': 'Üsküdar',
  'Kısıklı': 'Üsküdar',
  'Kuleli': 'Üsküdar',
  'Küçük Çamlıca': 'Üsküdar',
  'Küçüksu': 'Üsküdar',
  'Küplüce': 'Üsküdar',
  'Libadiye': 'Üsküdar',
  'Mimar Sinan Üsküdar': 'Üsküdar',
  'Salacak': 'Üsküdar',
  'Selamiali': 'Üsküdar',
  'Sultantepe': 'Üsküdar',
  'Şemsi Paşa': 'Üsküdar',
  'Valide-i Atik': 'Üsküdar',
  'Vaniköy': 'Üsküdar',

  // Fatih İlçesi
  'Aksaray': 'Fatih',
  'Alemdar': 'Fatih',
  'Ali Kuşçu': 'Fatih',
  'Atikali': 'Fatih',
  'Beyazıt': 'Fatih',
  'Binbirdirek': 'Fatih',
  'Cankurtaran': 'Fatih',
  'Cerrahpaşa': 'Fatih',
  'Eminönü': 'Fatih',
  'Hobyar': 'Fatih',
  'Kalenderhane': 'Fatih',
  'Karagümrük': 'Fatih',
  'Küçükayasofya': 'Fatih',
  'Laleli': 'Fatih',
  'Mimar Hayrettin': 'Fatih',
  'Mollafenari': 'Fatih',
  'Rüstempaşa': 'Fatih',
  'Saraçhane': 'Fatih',
  'Sultanahmet': 'Fatih',
  'Süleymaniye': 'Fatih',
  'Şehremini': 'Fatih',
  'Tahtakale': 'Fatih',
  'Topkapı': 'Fatih',
  'Yavuz Sultan Selim': 'Fatih',
  'Zeyrek': 'Fatih',

  // Bakırköy İlçesi
  'Ataköy': 'Bakırköy',
  'Bahçelievler': 'Bakırköy',
  'Basınköy': 'Bakırköy',
  'Cevizlik': 'Bakırköy',
  'Florya': 'Bakırköy',
  'İncirli': 'Bakırköy',
  'Kartaltepe': 'Bakırköy',
  'Osmaniye': 'Bakırköy',
  'Sakızağacı': 'Bakırköy',
  'Şenlikköy': 'Bakırköy',
  'Veliefendi': 'Bakırköy',
  'Yeşilköy': 'Bakırköy',
  'Yeşilyurt': 'Bakırköy',
  'Zuhuratbaba': 'Bakırköy',

  // Diğer önemli mahalleler eklenebilir...
};

/**
 * Mahalle/cadde adını gerçek ilçe adına çevirir
 * @param neighborhood - Mahalle/cadde adı
 * @returns İlçe adı veya orijinal ad (eşleşme yoksa)
 */
export function getDistrictFromNeighborhood(neighborhood: string): string {
  // Önce tam eşleşme ara
  if (NEIGHBORHOOD_TO_DISTRICT[neighborhood]) {
    return NEIGHBORHOOD_TO_DISTRICT[neighborhood];
  }

  // Kısmi eşleşme ara (mahalle adı içinde geçiyorsa)
  for (const [key, district] of Object.entries(NEIGHBORHOOD_TO_DISTRICT)) {
    if (neighborhood.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(neighborhood.toLowerCase())) {
      return district;
    }
  }

  // Eşleşme bulunamazsa orijinal adı döndür
  return neighborhood;
}