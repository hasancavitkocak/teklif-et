import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  Product,
  Purchase,
  PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

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
  purchaseDetails?: {
    purchaseToken?: string;
    packageName?: string;
    purchaseTime?: number;
    purchaseState?: number;
    acknowledged?: boolean;
    autoRenewing?: boolean;
    orderId?: string;
    originalJson?: string;
    signature?: string;
  };
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
      const subs = await fetchProducts({
        skus: [
          this.PRODUCTS.PREMIUM_WEEKLY,
          this.PRODUCTS.PREMIUM_MONTHLY,
          this.PRODUCTS.PREMIUM_YEARLY,
        ],
      });
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
      const inApps = await fetchProducts({
        skus: [
          this.PRODUCTS.SUPER_LIKE_5,
          this.PRODUCTS.SUPER_LIKE_10,
          this.PRODUCTS.BOOST_3,
        ],
      });
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
        isSubscription: !!product.subscriptionOfferDetailsAndroid?.length,
        title: product.title,
        price: product.price
      });

      let purchase: any;

      // For Android subscriptions, use requestPurchase - RN-IAP v14 DOĞRU YÖNTEMİ
      const isSubscription = product.subscriptionOfferDetailsAndroid?.length > 0;
      if (Platform.OS === 'android' && isSubscription) {
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
        
        // ✅ RN-IAP v14 DOĞRU KULLANIM - requestPurchase (subscription için)
        purchase = await requestPurchase({
          sku: productId,
          subscriptionOffers: [{
            sku: productId,
            offerToken,
          }],
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

      // Purchase array olabilir, ilkini al - TEK NOKTADA normalize et
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

      // ===== ACKNOWLEDGE İŞLEMİ (ZORUNLU!) =====
      if (Platform.OS === 'android' && purchaseData?.purchaseToken) {
        console.log('🔐 Satın alma acknowledge ediliyor...');
        const acknowledgeStartTime = Date.now();
        
        const acknowledged = await this.acknowledgePurchase(purchaseData.purchaseToken);
        const acknowledgeTime = Date.now() - acknowledgeStartTime;
        
        console.log('⏱️ Acknowledge süresi:', acknowledgeTime + 'ms');
        
        if (!acknowledged) {
          // ❌ KRITIK: Acknowledge başarısız olursa işlemi durdur
          console.error('❌ KRITIK: Acknowledge başarısız!');
          throw new Error('Satın alma acknowledge edilemedi. Abonelik askıya alınabilir.');
        }
        console.log('✅ Acknowledge başarılı');
      }

      return {
        success: true,
        transactionId: purchaseData?.transactionId || purchaseData?.purchaseToken || '',
        productId: purchaseData?.productId || productId,
        // Google Play Store detaylarını da döndür
        purchaseDetails: {
          purchaseToken: purchaseData?.purchaseToken,
          packageName: purchaseData?.packageName,
          purchaseTime: purchaseData?.purchaseTime,
          purchaseState: purchaseData?.purchaseState,
          acknowledged: purchaseData?.acknowledged,
          autoRenewing: purchaseData?.autoRenewing,
          orderId: purchaseData?.orderId,
          originalJson: purchaseData?.originalJson,
          signature: purchaseData?.signature
        }
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

  // ===== ACKNOWLEDGE İŞLEMLERİ (ZORUNLU!) =====
  async acknowledgePurchase(purchaseToken: string, retryCount: number = 0): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('🍎 iOS - Acknowledge gerekmiyor');
        return true;
      }

      console.log('🔐 Android satın alma acknowledge ediliyor:', purchaseToken, `(Deneme: ${retryCount + 1})`);
      
      const result = await acknowledgePurchaseAndroid(purchaseToken);
      
      console.log('✅ Acknowledge başarılı:', result);
      return true;
    } catch (error: any) {
      console.error('❌ Acknowledge hatası:', error);
      
      // 3 kez dene
      if (retryCount < 2) {
        console.log(`🔄 Acknowledge tekrar deneniyor... (${retryCount + 2}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
        return this.acknowledgePurchase(purchaseToken, retryCount + 1);
      }
      
      return false;
    }
  }

  // ===== BACKEND DOĞRULAMA =====
  async validatePurchaseWithBackend(
    purchaseToken: string, 
    productId: string, 
    packageId: string
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    console.log('🔍 ===== BACKEND DOĞRULAMA BAŞLADI =====');
    console.log('📋 Backend Validation Request:', {
      purchaseToken: purchaseToken ? `${purchaseToken.substring(0, 20)}...` : 'YOK',
      productId,
      packageId,
      timestamp: new Date().toISOString()
    });

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ Kullanıcı oturumu bulunamadı');
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      console.log('👤 User ID:', user.user.id);

      // Backend doğrulama fonksiyonu çağır
      console.log('🚀 Supabase RPC çağrılıyor: validate_google_play_purchase');
      const rpcParams = {
        p_user_id: user.user.id,
        p_package_id: packageId,
        p_purchase_token: purchaseToken,
        p_product_id: productId
      };
      console.log('📋 RPC Parameters:', rpcParams);

      const { data, error } = await supabase.rpc('validate_google_play_purchase', rpcParams);

      const responseTime = Date.now() - startTime;
      console.log('⏱️ Backend response süresi:', responseTime + 'ms');

      if (error) {
        console.error('❌ Backend doğrulama RPC hatası:', {
          error: error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: error.message };
      }

      console.log('✅ Backend doğrulama response:', JSON.stringify(data, null, 2));
      console.log('🎉 ===== BACKEND DOĞRULAMA TAMAMLANDI =====');
      
      return { success: true };
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ ===== BACKEND DOĞRULAMA HATASI =====');
      console.error('⏱️ Hata süresi:', errorTime + 'ms');
      console.error('🔍 Backend doğrulama hatası:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        error: error
      });
      return { success: false, error: error.message || 'Backend doğrulama başarısız' };
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