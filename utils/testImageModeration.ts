// Fotoğraf moderation test fonksiyonu
// Bu fonksiyonu geliştirme sırasında test için kullanabilirsin

const GOOGLE_VISION_API_KEY = 'AIzaSyAh4mdEPyg45s8Zc6aKh2Mlo2uItUyR4xc';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  reasons: string[];
  details: {
    adult: string;
    racy: string;
    violence: string;
    medical: string;
    spoof: string;
  };
}

export async function testImageModeration(imageUrl: string): Promise<ModerationResult> {
  try {
    console.log('🔍 Fotoğraf kontrol ediliyor:', imageUrl.substring(0, 50) + '...');

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl
                }
              },
              features: [
                {
                  type: 'SAFE_SEARCH_DETECTION'
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const safeSearch = data.responses[0]?.safeSearchAnnotation;

    if (!safeSearch) {
      throw new Error('Safe search annotation not found');
    }

    // İçeriği değerlendir
    const isInappropriate = 
      safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY' ||
      safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY' ||
      safeSearch.adult === 'POSSIBLE' || safeSearch.racy === 'POSSIBLE';

    const reasons = [];
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      reasons.push('Adult/explicit content detected');
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      reasons.push('Racy/suggestive content detected');
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      reasons.push('Violent content detected');
    }
    if (safeSearch.adult === 'POSSIBLE' || safeSearch.racy === 'POSSIBLE') {
      reasons.push('Potentially inappropriate content');
    }

    if (reasons.length === 0) {
      reasons.push('Content appears appropriate');
    }

    const confidence = isInappropriate ? 0.8 : 0.95;

    console.log('📊 Moderation sonucu:', {
      isAppropriate: !isInappropriate,
      confidence,
      reasons,
      details: safeSearch
    });

    return {
      isAppropriate: !isInappropriate,
      confidence,
      reasons,
      details: {
        adult: safeSearch.adult,
        racy: safeSearch.racy,
        violence: safeSearch.violence,
        medical: safeSearch.medical,
        spoof: safeSearch.spoof
      }
    };

  } catch (error) {
    console.error('❌ Moderation hatası:', error);
    
    return {
      isAppropriate: false,
      confidence: 0,
      reasons: ['Moderation service error - manual review required'],
      details: {
        adult: 'UNKNOWN',
        racy: 'UNKNOWN',
        violence: 'UNKNOWN',
        medical: 'UNKNOWN',
        spoof: 'UNKNOWN'
      }
    };
  }
}

// Test fonksiyonu
export async function runModerationTest() {
  console.log('🧪 Image Moderation Test Başlıyor...\n');

  // Test URL'leri (güvenli resimler)
  const testImages = [
    'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
    'https://images.unsplash.com/photo-1494790108755-2616c6d4e6e8?w=400', // Portre
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', // Erkek portre
  ];

  for (const imageUrl of testImages) {
    console.log(`\n🔍 Test: ${imageUrl.substring(0, 60)}...`);
    const result = await testImageModeration(imageUrl);
    
    if (result.isAppropriate) {
      console.log('✅ UYGUN - Fotoğraf onaylandı');
    } else {
      console.log('❌ UYGUNSUZ - Fotoğraf reddedildi');
      console.log('📝 Nedenler:', result.reasons.join(', '));
    }
  }

  console.log('\n🎉 Test tamamlandı!');
}

export default testImageModeration;