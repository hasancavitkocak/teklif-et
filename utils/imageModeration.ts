// Image Moderation with Google Vision API
// Fotoğraf yükleme öncesi otomatik kontrol

const GOOGLE_VISION_API_KEY = 'AIzaSyAh4mdEPyg45s8Zc6aKh2Mlo2uItUyR4xc';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: number;
  reasons: string[];
  details?: any;
}

export async function checkImageBeforeUpload(imageUrl: string): Promise<ModerationResult> {
  try {
    console.log('🔍 Vision API ile fotoğraf kontrol ediliyor...');

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
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const safeSearch = data.responses[0]?.safeSearchAnnotation;

    if (!safeSearch) {
      // Annotation bulunamazsa güvenli kabul et
      console.log('⚠️ Vision API annotation bulunamadı, güvenli kabul ediliyor');
      return {
        isAppropriate: true,
        confidence: 0.5,
        reasons: ['Vision API analiz edemedi - güvenli kabul edildi'],
        details: null
      };
    }

    // İçeriği değerlendir - ÇOK TOLERANSLI (sadece VERY_LIKELY reddedilir)
    const isInappropriate = 
      safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.racy === 'VERY_LIKELY' ||
      safeSearch.violence === 'VERY_LIKELY';

    // LIKELY bile kabul ediliyor artık - sadece VERY_LIKELY reddediliyor
    const finallyInappropriate = isInappropriate;

    const reasons = [];
    if (safeSearch.adult === 'VERY_LIKELY') {
      reasons.push('Açık çıplak içerik tespit edildi');
    }
    if (safeSearch.racy === 'VERY_LIKELY') {
      reasons.push('Açık müstehcen içerik tespit edildi');
    }
    if (safeSearch.violence === 'VERY_LIKELY') {
      reasons.push('Açık şiddet içeriği tespit edildi');
    }

    if (reasons.length === 0) {
      reasons.push('Fotoğraf uygun görünüyor');
    }

    const confidence = finallyInappropriate ? 0.8 : 0.95;

    console.log('📊 Vision API sonucu:', {
      isAppropriate: !finallyInappropriate,
      confidence,
      reasons,
      visionResults: safeSearch
    });

    return {
      isAppropriate: !finallyInappropriate,
      confidence,
      reasons,
      details: safeSearch
    };

  } catch (error) {
    console.error('❌ Vision API hatası:', error);
    
    // Hata durumunda güvenli tarafta kal - fotoğrafı onaylanmış kabul et
    return {
      isAppropriate: true,
      confidence: 0.3,
      reasons: ['Vision API hatası - fotoğraf onaylandı'],
      details: null
    };
  }
}

// Base64 image için
export async function checkBase64Image(base64Image: string): Promise<ModerationResult> {
  try {
    console.log('🔍 Vision API ile base64 fotoğraf kontrol ediliyor...');

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
                content: base64Image
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
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const safeSearch = data.responses[0]?.safeSearchAnnotation;

    if (!safeSearch) {
      return {
        isAppropriate: true,
        confidence: 0.5,
        reasons: ['Vision API analiz edemedi - güvenli kabul edildi'],
        details: null
      };
    }

    const isInappropriate = 
      safeSearch.adult === 'VERY_LIKELY' ||
      safeSearch.racy === 'VERY_LIKELY' ||
      safeSearch.violence === 'VERY_LIKELY';
      // Sadece VERY_LIKELY reddediliyor - çok toleranslı

    const reasons = [];
    if (isInappropriate) {
      reasons.push('Uygunsuz içerik tespit edildi');
    } else {
      reasons.push('Fotoğraf uygun görünüyor');
    }

    return {
      isAppropriate: !isInappropriate,
      confidence: isInappropriate ? 0.8 : 0.95,
      reasons,
      details: safeSearch
    };

  } catch (error) {
    console.error('❌ Vision API Base64 hatası:', error);
    return {
      isAppropriate: true,
      confidence: 0.3,
      reasons: ['Vision API hatası - fotoğraf onaylandı'],
      details: null
    };
  }
}

export default checkImageBeforeUpload;