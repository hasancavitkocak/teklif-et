// Simple Image Moderation Test Script
// Çalıştır: node scripts/test-moderation-simple.js

const GOOGLE_VISION_API_KEY = 'AIzaSyAh4mdEPyg45s8Zc6aKh2Mlo2uItUyR4xc';

async function testImageModeration(imageUrl) {
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

    console.log('📊 Vision API sonuçları:');
    console.log('   Adult:', safeSearch.adult);
    console.log('   Racy:', safeSearch.racy);
    console.log('   Violence:', safeSearch.violence);
    console.log('   Medical:', safeSearch.medical);
    console.log('   Spoof:', safeSearch.spoof);

    const result = {
      isAppropriate: !isInappropriate,
      confidence,
      reasons,
      details: safeSearch
    };

    if (result.isAppropriate) {
      console.log('✅ SONUÇ: Fotoğraf UYGUN - Onaylandı');
    } else {
      console.log('❌ SONUÇ: Fotoğraf UYGUNSUZ - Reddedildi');
      console.log('📝 Nedenler:', result.reasons.join(', '));
    }

    return result;

  } catch (error) {
    console.error('❌ Moderation hatası:', error);
    return {
      isAppropriate: false,
      confidence: 0,
      reasons: ['Moderation service error'],
      details: null
    };
  }
}

async function runModerationTest() {
  console.log('🧪 Image Moderation Test Başlıyor...\n');

  // Test URL'leri
  const testImages = [
    {
      name: 'Google Logo (Güvenli)',
      url: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
    },
    {
      name: 'Unsplash Portre (Güvenli)',
      url: 'https://images.unsplash.com/photo-1494790108755-2616c6d4e6e8?w=400'
    },
    {
      name: 'Unsplash Erkek Portre (Güvenli)', 
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    }
  ];

  for (const image of testImages) {
    console.log(`\n🔍 Test: ${image.name}`);
    console.log(`📷 URL: ${image.url}`);
    console.log('─'.repeat(60));
    
    const result = await testImageModeration(image.url);
    
    console.log('─'.repeat(60));
    
    // 1 saniye bekle (API rate limit için)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Tüm testler tamamlandı!');
  console.log('\n💡 Sistem hazır! Artık fotoğraf yükleme sistemine entegre edebiliriz.');
}

// Test'i çalıştır
runModerationTest().catch(console.error);