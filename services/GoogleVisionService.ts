import { ImageAnnotatorClient } from '@google-cloud/vision';

export interface SafeSearchResult {
  adult: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  spoof: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  medical: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  violence: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  racy: 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
}

export interface ContentModerationResult {
  isAppropriate: boolean;
  confidence: number;
  reasons: string[];
  details: SafeSearchResult;
}

export class GoogleVisionService {
  private client: ImageAnnotatorClient;

  constructor() {
    // Google Cloud credentials should be set via environment variables
    // GOOGLE_APPLICATION_CREDENTIALS or service account key
    this.client = new ImageAnnotatorClient();
  }

  /**
   * Fotoğrafın uygun olup olmadığını kontrol eder
   */
  async checkImageContent(imageUrl: string): Promise<ContentModerationResult> {
    try {
      console.log('🔍 Google Vision ile fotoğraf kontrol ediliyor:', imageUrl.substring(0, 50) + '...');

      const [result] = await this.client.safeSearchDetection({
        image: {
          source: {
            imageUri: imageUrl
          }
        }
      });

      const safeSearch = result.safeSearchAnnotation;
      
      if (!safeSearch) {
        throw new Error('Safe search annotation not found');
      }

      const safeSearchResult: SafeSearchResult = {
        adult: safeSearch.adult || 'UNKNOWN',
        spoof: safeSearch.spoof || 'UNKNOWN', 
        medical: safeSearch.medical || 'UNKNOWN',
        violence: safeSearch.violence || 'UNKNOWN',
        racy: safeSearch.racy || 'UNKNOWN'
      };

      // İçeriği değerlendir
      const evaluation = this.evaluateContent(safeSearchResult);
      
      console.log('✅ Google Vision sonucu:', {
        isAppropriate: evaluation.isAppropriate,
        confidence: evaluation.confidence,
        reasons: evaluation.reasons
      });

      return {
        ...evaluation,
        details: safeSearchResult
      };

    } catch (error) {
      console.error('❌ Google Vision hatası:', error);
      
      // Hata durumunda güvenli tarafta kal - manuel inceleme gerekli
      return {
        isAppropriate: false,
        confidence: 0,
        reasons: ['Google Vision API error - manual review required'],
        details: {
          adult: 'UNKNOWN',
          spoof: 'UNKNOWN',
          medical: 'UNKNOWN', 
          violence: 'UNKNOWN',
          racy: 'UNKNOWN'
        }
      };
    }
  }

  /**
   * Safe search sonuçlarını değerlendirir
   */
  private evaluateContent(safeSearch: SafeSearchResult): Omit<ContentModerationResult, 'details'> {
    const reasons: string[] = [];
    let isAppropriate = true;
    let confidence = 1.0;

    // Adult content kontrolü (en kritik)
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      isAppropriate = false;
      reasons.push('Adult/explicit content detected');
      confidence = safeSearch.adult === 'VERY_LIKELY' ? 0.95 : 0.8;
    }

    // Racy content kontrolü (müstehcen ama çıplak değil)
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      isAppropriate = false;
      reasons.push('Racy/suggestive content detected');
      confidence = Math.max(confidence, safeSearch.racy === 'VERY_LIKELY' ? 0.9 : 0.75);
    }

    // Violence kontrolü
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      isAppropriate = false;
      reasons.push('Violent content detected');
      confidence = Math.max(confidence, safeSearch.violence === 'VERY_LIKELY' ? 0.9 : 0.75);
    }

    // Şüpheli durumlar (POSSIBLE) - daha toleranslı
    if (safeSearch.adult === 'POSSIBLE' || safeSearch.racy === 'POSSIBLE') {
      // POSSIBLE durumunda reddetme, ama confidence düşük
      isAppropriate = false;
      reasons.push('Potentially inappropriate content - requires review');
      confidence = 0.6;
    }

    // Eğer hiç sorun yoksa
    if (reasons.length === 0) {
      reasons.push('Content appears appropriate');
      confidence = 0.95;
    }

    return {
      isAppropriate,
      confidence,
      reasons
    };
  }

  /**
   * Batch processing için birden fazla fotoğrafı kontrol eder
   */
  async checkMultipleImages(imageUrls: string[]): Promise<ContentModerationResult[]> {
    const promises = imageUrls.map(url => this.checkImageContent(url));
    return Promise.all(promises);
  }

  /**
   * Base64 encoded image'ı kontrol eder
   */
  async checkBase64Image(base64Image: string): Promise<ContentModerationResult> {
    try {
      const [result] = await this.client.safeSearchDetection({
        image: {
          content: base64Image
        }
      });

      const safeSearch = result.safeSearchAnnotation;
      
      if (!safeSearch) {
        throw new Error('Safe search annotation not found');
      }

      const safeSearchResult: SafeSearchResult = {
        adult: safeSearch.adult || 'UNKNOWN',
        spoof: safeSearch.spoof || 'UNKNOWN',
        medical: safeSearch.medical || 'UNKNOWN', 
        violence: safeSearch.violence || 'UNKNOWN',
        racy: safeSearch.racy || 'UNKNOWN'
      };

      const evaluation = this.evaluateContent(safeSearchResult);

      return {
        ...evaluation,
        details: safeSearchResult
      };

    } catch (error) {
      console.error('❌ Google Vision Base64 hatası:', error);
      
      return {
        isAppropriate: false,
        confidence: 0,
        reasons: ['Google Vision API error - manual review required'],
        details: {
          adult: 'UNKNOWN',
          spoof: 'UNKNOWN', 
          medical: 'UNKNOWN',
          violence: 'UNKNOWN',
          racy: 'UNKNOWN'
        }
      };
    }
  }
}

// Singleton instance
export const googleVisionService = new GoogleVisionService();
export default googleVisionService;