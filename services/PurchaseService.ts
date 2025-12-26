import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  Product,
  Purchase,
  PurchaseError,
} from 'react-native-iap';

// requestSubscription'ı manuel import et (TypeScript cache problemi için)
const { requestSubscription } = require('react-native-iap');
import { Platform } from 'react-native';

export interface PurchaseProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  currency: string;
  title: string;
  description: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

export interface RestorePurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

class PurchaseService {
  private isInitialized = false;
  private products: any[] = [];
  private offerTokens: Map<string, string> = new Map(); // Store offer tokens for subscriptions

  // Product IDs - Bu ID'ler Google Play Console'da tanımlanmalı
  public readonly PRODUCTS = {
    PREMIUM_WEEKLY: 'premiumweekly',
    PREMIUM_MONTHLY: 'premiummonthly', 
    PREMIUM_YEARLY: 'premiumyearly',
    SUPER_LIKE_5: 'superlike5',
    SUPER_LIKE_10: 'superlike10',
    BOOST_3: 'boost3',
  };

  private readonly productIds = Object.values(this.PRODUCTS);

  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Purchase service başlatılıyor...');
      
      const result = await initConnection();
      console.log('📱 IAP bağlantısı kuruldu:', result);
      
      this.isInitialized = true;
      
      // Ürünleri yükle
      await this.loadProducts();
      
      return true;
    } catch (error) {
      console.error('❌ Purchase service başlatma hatası:', error);
      return false;
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      console.log('📄 fetchProducts API çağrısı başlıyor...');
      
      // Subscription products
      const subscriptionProducts = await fetchProducts({
        skus: [this.PRODUCTS.PREMIUM_WEEKLY, this.PRODUCTS.PREMIUM_MONTHLY, this.PRODUCTS.PREMIUM_YEARLY],
        type: 'subs'
      });
      
      const subs = subscriptionProducts || [];
      console.log('✅ fetchProducts (subs) başarılı, ürün sayısı:', subs.length);
      console.log('📦 Abonelik ham verisi:', JSON.stringify(subs, null, 2));
      
      // Store offer tokens for Android subscriptions
      if (Platform.OS === 'android') {
        subs.forEach((product: any) => {
          console.log('🔍 Sub verisi kontrol ediliyor:', product.id);
          if (product.subscriptionOfferDetailsAndroid && product.subscriptionOfferDetailsAndroid.length > 0) {
            const offerToken = product.subscriptionOfferDetailsAndroid[0].offerToken;
            this.offerTokens.set(product.id, offerToken);
            console.log('💾 Offer token kaydedildi:', product.id, offerToken);
          }
        });
      }
      
      // In-app products
      const inAppProducts = await fetchProducts({
        skus: [this.PRODUCTS.SUPER_LIKE_5, this.PRODUCTS.SUPER_LIKE_10, this.PRODUCTS.BOOST_3],
        type: 'in-app'
      });
      
      const inApps = inAppProducts || [];
      console.log('✅ fetchProducts (inapp) başarılı, ürün sayısı:', inApps.length);
      
      // Combine all products
      this.products = [...subs, ...inApps];
      
      console.log('✅ Google Play Store\'dan alınan toplam ürün:', this.products.length);
      console.log('📦 Ham ürün verisi:', JSON.stringify(this.products, null, 2));
      console.log('📦 Ürün detayları:', this.products.map((p: any) => ({
        id: p.id,  // ✅ DOĞRU - p.productId değil p.id
        price: p.price,
        title: p.title
      })));
      
    } catch (error) {
      console.error('❌ Ürün yükleme hatası:', error);
      this.products = [];
    }
  }

  async getProducts(): Promise<PurchaseProduct[]> {
    if (!this.isInitialized) {
      console.warn('⚠️ Purchase service henüz başlatılmadı');
      return [];
    }

    return this.products.map((product: any) => ({
      productId: product.id || '',  // ✅ DOĞRU - product.id kullan
      price: product.price?.toString() || '0',
      localizedPrice: product.localizedPrice || product.price || '₺0,00',
      currency: product.currency || 'TRY',
      title: product.title || '',
      description: product.description || '',
    }));
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Purchase service başlatılmadı');
      }

      console.log('🛒 Satın alma başlatılıyor:', productId);
      
      // Android için Google Play Store satın alma
      if (Platform.OS === 'android') {
        console.log('🛒 Google Play Store satın alma başlatılıyor...');
      }
      
      console.log('📋 Ürün ID:', productId);
      
      // Find the product to determine if it's a subscription or in-app
      const product = this.products.find(p => p.id === productId);
      if (!product) {
        throw new Error(`Ürün bulunamadı: ${productId}`);
      }

      console.log('🔍 Bulunan ürün:', {
        id: product.id,
        type: product.type,
        title: product.title,
        price: product.price
      });

      let purchase: any;

      // For Android subscriptions, use requestSubscription - TEK DOĞRU YOL
      if (Platform.OS === 'android' && product.type === 'subs') {
        const offerToken = this.offerTokens.get(productId);
        if (!offerToken) {
          throw new Error(`Offer token bulunamadı: ${productId}`);
        }

        const subscriptionRequest = {
          sku: productId,
          subscriptionOffers: [{
            sku: productId,
            offerToken: offerToken,
          }]
        };

        console.log('📋 Subscription request:', JSON.stringify(subscriptionRequest, null, 2));
        
        // ✅ TEK DOĞRU ÇÖZÜM - requestSubscription (RN-IAP v14)
        purchase = await requestSubscription({
          sku: productId,
          subscriptionOffers: [{
            sku: productId,
            offerToken: offerToken,
          }]
        });
        
      } else {
        // For in-app purchases, use requestPurchase
        const inAppRequest = {
          sku: productId
        };

        console.log('📋 In-app request (requestPurchase):', JSON.stringify(inAppRequest, null, 2));
        
        // Use requestPurchase for in-app products
        purchase = await requestPurchase(inAppRequest as any);
      }

      console.log('✅ Satın alma başarılı - Ham Response:', JSON.stringify(purchase, null, 2));
      
      // Response detaylarını logla
      console.log('📦 Response Detayları:', {
        type: typeof purchase,
        isArray: Array.isArray(purchase),
        length: Array.isArray(purchase) ? purchase.length : 'N/A',
        keys: purchase ? Object.keys(purchase) : 'N/A'
      });

      // Purchase array olabilir, ilkini al
      const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;
      
      console.log('🔍 İşlenmiş Purchase Data:', JSON.stringify(purchaseData, null, 2));
      console.log('📋 Purchase Data Alanları:', {
        transactionId: purchaseData?.transactionId,
        purchaseToken: purchaseData?.purchaseToken,
        productId: purchaseData?.productId,
        packageName: purchaseData?.packageName,
        purchaseTime: purchaseData?.purchaseTime,
        purchaseState: purchaseData?.purchaseState,
        acknowledged: purchaseData?.acknowledged,
        autoRenewing: purchaseData?.autoRenewing,
        orderId: purchaseData?.orderId,
        originalJson: purchaseData?.originalJson ? 'Mevcut' : 'Yok',
        signature: purchaseData?.signature ? 'Mevcut' : 'Yok'
      });

      return {
        success: true,
        transactionId: purchaseData?.transactionId || purchaseData?.purchaseToken || '',
        productId: purchaseData?.productId || productId,
      };
    } catch (error: any) {
      console.error('❌ Google Play Store satın alma hatası:', error);
      
      // Enhanced error logging with all available fields
      const errorDetails = {
        message: error.message || 'Bilinmeyen hata',
        name: error.name || 'UnknownError',
        code: error.code || 'unknown',
        responseCode: error.responseCode || undefined,
        debugMessage: error.debugMessage || undefined,
        userInfo: error.userInfo || undefined,
        productId: error.productId || productId,
        platform: Platform.OS
      };
      
      console.error('🔍 Store hata detayları:', errorDetails);
      
      let errorMessage = 'Satın alma işlemi başarısız';
      
      if (error.code === 'E_USER_CANCELLED') {
        errorMessage = 'Satın alma kullanıcı tarafından iptal edildi';
      } else if (error.code === 'E_NETWORK_ERROR') {
        errorMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin';
      } else if (error.code === 'E_SERVICE_ERROR') {
        errorMessage = 'Google Play Store hizmet hatası. Lütfen daha sonra tekrar deneyin';
      } else if (error.code === 'E_DEVELOPER_ERROR') {
        errorMessage = 'Uygulama yapılandırma hatası. Lütfen uygulamayı güncelleyin';
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        errorMessage = 'Bu ürün şu anda satın alınamıyor';
      } else if (error.code === 'E_ALREADY_OWNED') {
        errorMessage = 'Bu ürün zaten satın alınmış';
      } else if (error.message && error.message.includes('Missing purchase request configuration')) {
        errorMessage = 'Satın alma yapılandırması eksik. Offer token veya ürün bilgisi eksik olabilir';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Development ortamında özel mesaj
      if (__DEV__) {
        errorMessage = `Development Build: ${errorMessage}. Production APK/AAB ile test edin.`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async validatePurchase(transactionId: string, productId: string): Promise<boolean> {
    try {
      console.log('🔍 Satın alma doğrulanıyor:', { transactionId, productId });
      
      // Development ortamında her zaman true döndür
      // Production'da gerçek validation yapılacak
      if (__DEV__) {
        console.log('🔧 Development modunda - validation bypass');
        return true;
      }

      // Production validation burada yapılacak
      // Backend API'ye gönderilecek
      
      return true;
    } catch (error) {
      console.error('❌ Satın alma doğrulama hatası:', error);
      return false;
    }
  }

  async restorePurchases(): Promise<RestorePurchaseResult[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Purchase service başlatılmadı');
      }

      console.log('🔄 Satın almalar geri yükleniyor...');
      
      const purchases = await getAvailablePurchases();
      
      console.log('📋 Bulunan satın almalar:', purchases.length);
      
      const results: RestorePurchaseResult[] = purchases.map((purchase: any) => ({
        success: true,
        transactionId: purchase.transactionId || undefined,
        productId: purchase.productId || '',
      }));

      return results;
    } catch (error: any) {
      console.error('❌ Satın alma geri yükleme hatası:', error);
      
      return [{
        success: false,
        error: error.message || 'Satın almalar geri yüklenemedi',
      }];
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isInitialized) {
        await endConnection();
        this.isInitialized = false;
        console.log('🔌 Purchase service bağlantısı kapatıldı');
      }
    } catch (error) {
      console.error('❌ Purchase service kapatma hatası:', error);
    }
  }
}

export const purchaseService = new PurchaseService();
export default purchaseService;