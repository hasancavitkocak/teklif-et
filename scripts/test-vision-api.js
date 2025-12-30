// Google Vision API Test Script
// Node.js ile çalıştır: node scripts/test-vision-api.js

const API_KEY = 'AIzaSyAh4mdEPyg45s8Zc6aKh2Mlo2uItUyR4xc';

async function testVisionAPI() {
  try {
    console.log('🧪 Google Vision API test ediliyor...');
    
    // Test için güvenli bir resim URL'i (Google'ın kendi logosu)
    const testImageUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
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
                  imageUri: testImageUrl
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

    if (safeSearch) {
      console.log('✅ API çalışıyor! Safe Search sonuçları:');
      console.log('📊 Adult:', safeSearch.adult);
      console.log('📊 Racy:', safeSearch.racy);
      console.log('📊 Violence:', safeSearch.violence);
      console.log('📊 Medical:', safeSearch.medical);
      console.log('📊 Spoof:', safeSearch.spoof);
      
      // Google logosu güvenli olmalı
      if (safeSearch.adult === 'VERY_UNLIKELY') {
        console.log('🎉 Test başarılı! API doğru çalışıyor.');
      } else {
        console.log('⚠️ Beklenmedik sonuç, ama API çalışıyor.');
      }
    } else {
      console.log('❌ Safe search annotation bulunamadı');
    }

  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    
    if (error.message.includes('403')) {
      console.log('💡 API key geçersiz veya Vision API aktif değil');
    } else if (error.message.includes('400')) {
      console.log('💡 İstek formatı hatalı');
    } else {
      console.log('💡 Network hatası veya başka bir sorun');
    }
  }
}

// Test'i çalıştır
testVisionAPI();