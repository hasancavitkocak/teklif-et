import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  purchaseUpdatedListener,
  purchaseErrorListener,
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
  purchaseToken?: string;
  error?: string;
}

class PurchaseService {
  private isInitialized = false;
  private products: any[] = [];
  private offerTokens: Map<string, string> = new Map();
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private pendingPurchaseResolve: ((value: PurchaseResult) => void) | null = null;
  private pendingPurchaseReject: ((reason: any) => void) | null = null;

  // Product IDs - Bu ID'ler Google Play Console'da tanımlanmalı
  public readonly PRODUCTS = {
    PREMIUM_WEEKLY: 'premiumweekly',
    PREMIUM_MONTHLY: 'premiummonthly', 
    PREMIUM_YEARLY: 'premiumyearly',
    SUPER_LIKE_5: 'superlike5',
    SUPER_LIKE_10: 'superlike10',
    BOOST_3: 'boost3',
  };

  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Purchase service başlatılıyor...');
      
      const result = await initConnection();
      console.log('📱 IAP bağlantısı kuruldu:', result);
      
      // 🔥 EVENT LISTENER'LARI KUR
      this.setupEventListeners();
      
      this.isInitialized = true;
      
      // Ürünleri yükle
      await this.loadProducts();
      
      return true;
    } catch (error) {
      console.error('❌ Purchase service başlatma hatası:', error);
      return false;
    }
  }

  private setupEventListeners(): void {
    console.log('🎧 Purchase event listener\'ları kuruluyor...');
    
    // Purchase success listener
    this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase: any) => {
      console.log('✅ Purchase updated event:', JSON.stringify(purchase, null, 2));
      
      if (this.pendingPurchaseResolve) {
        const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;
        
        // Acknowledge işlemi
        if (Platform.OS === 'android' && purchaseData?.purchaseToken) {
          this.acknowledgePurchase(purchaseData.purchaseToken).then((acknowledged) => {
            if (acknowledged) {
              console.log('✅ Purchase acknowledged successfully');
            }
          });
        }
        
        // Purchase state'i doğru formata çevir
        let purchaseStateValue = purchaseData?.purchaseState;
        if (typeof purchaseStateValue === 'string') {
          // String'i integer'a çevir
          purchaseStateValue = purchaseStateValue.toLowerCase() === 'purchased' ? 0 : 1;
        }

        this.pendingPurchaseResolve({
          success: true,
          transactionId: purchaseData?.transactionId || purchaseData?.purchaseToken || '',
          productId: purchaseData?.productId || '',
          purchaseDetails: {
            purchaseToken: purchaseData?.purchaseToken || null,
            packageName: purchaseData?.packageNameAndroid || purchaseData?.packageName || null,
            purchaseTime: purchaseData?.transactionDate || purchaseData?.purchaseTime || null,
            purchaseState: purchaseStateValue ?? 0, // Artık doğru integer değer
            acknowledged: purchaseData?.isAcknowledgedAndroid ?? purchaseData?.acknowledged ?? false,
            autoRenewing: purchaseData?.isAutoRenewing ?? purchaseData?.autoRenewingAndroid ?? purchaseData?.autoRenewing ?? null,
            orderId: purchaseData?.transactionId || purchaseData?.orderId || null,
            originalJson: purchaseData?.dataAndroid || purchaseData?.originalJson || null,
            signature: purchaseData?.signatureAndroid || purchaseData?.signature || null
          }
        });
        
        this.pendingPurchaseResolve = null;
        this.pendingPurchaseReject = null;
      }
    });
    
    // Purchase error listener
    this.purchaseErrorSubscription = purchaseErrorListener((error: any) => {
      console.error('❌ Purchase error event:', JSON.stringify(error, null, 2));
      
      if (this.pendingPurchaseReject) {
        let errorMessage = 'Satın alma işlemi başarısız';
        
        if (error.code === 'E_USER_CANCELLED') {
          errorMessage = 'Satın alma kullanıcı tarafından iptal edildi';
        } else if (error.code === 'E_NETWORK_ERROR') {
          errorMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin';
        } else if (error.message) {
          errorMessage = error.message;
        }

        if (__DEV__) {
          errorMessage = `Development Build: ${errorMessage}. Production APK/AAB ile test edin.`;
        }
        
        this.pendingPurchaseReject({
          success: false,
          error: errorMessage,
        });
        
        this.pendingPurchaseResolve = null;
        this.pendingPurchaseReject = null;
      }
    });
    
    console.log('✅ Event listener\'lar kuruldu');
  }

  private async loadProducts(): Promise<void> {
    try {
      console.log('🔥 EXPO + fetchProducts ile ürün yükleme başlıyor...');
      
      // 🔥 1. SUBSCRIPTION ÜRÜNLER
      const subscriptions = await fetchProducts({
        skus: [
          this.PRODUCTS.PREMIUM_WEEKLY,
          this.PRODUCTS.PREMIUM_MONTHLY,
          this.PRODUCTS.PREMIUM_YEARLY,
        ],
        type: 'subs'
      });
      
      console.log('✅ Subscriptions yüklendi:', subscriptions?.length || 0);
      console.log('📦 Subscription verisi:', JSON.stringify(subscriptions, null, 2));
      
      // 🔥 2. IN-APP ÜRÜNLER  
      const inAppProducts = await fetchProducts({
        skus: [
          this.PRODUCTS.SUPER_LIKE_5,
          this.PRODUCTS.SUPER_LIKE_10,
          this.PRODUCTS.BOOST_3,
        ],
        type: 'in-app'
      });
      
      console.log('✅ In-app products yüklendi:', inAppProducts?.length || 0);
      console.log('📦 In-app verisi:', JSON.stringify(inAppProducts, null, 2));
      
      // 🔥 3. TÜM ÜRÜNLER BİRLEŞTİR
      this.products = [...(subscriptions || []), ...(inAppProducts || [])];
      
      // 🔥 Android subscription offer token topla
      if (Platform.OS === 'android') {
        (subscriptions || []).forEach((product: any) => {
          if (product.subscriptionOfferDetailsAndroid?.length) {
            const offerToken = product.subscriptionOfferDetailsAndroid[0].offerToken;
            this.offerTokens.set(product.id, offerToken);
            console.log('💾 Offer token kaydedildi:', product.id, offerToken);
          }
        });
      }
      
      console.log('🔥 TOPLAM ÜRÜN SAYISI:', this.products.length);
      console.log('🧪 Mevcut ürünler:', this.products.map(p => p.id));
      
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
      productId: product.id,
      price: product.price?.toString() || '0',
      localizedPrice: product.localizedPrice || product.price || '₺0,00',
      currency: product.currency || 'TRY',
      title: product.title || '',
      description: product.description || '',
    }));
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isInitialized) {
          throw new Error('Purchase service başlatılmadı');
        }

        if (!this.products.length) {
          throw new Error('Store ürünleri henüz yüklenmedi');
        }

        console.log('🧪 Mevcut ürünler:', this.products.map(p => p.id));
        console.log('🛒 Satın alma başlatılıyor:', productId);
        
        const product = this.products.find(p => p.id === productId);
        if (!product) {
          console.error('❌ Ürün bulunamadı! Mevcut ürünler:', this.products.map(p => p.id));
          throw new Error(`Ürün bulunamadı: ${productId}`);
        }

        console.log('🔍 Bulunan ürün:', {
          id: product.id,
          isSubscription: !!product.subscriptionOfferDetailsAndroid?.length,
          title: product.title,
          price: product.price
        });

        // 🔥 EVENT-BASED PURCHASE - Promise setup
        this.pendingPurchaseResolve = resolve;
        this.pendingPurchaseReject = reject;

        const isSubscription = product.subscriptionOfferDetailsAndroid?.length > 0;
        
        if (Platform.OS === 'android' && isSubscription) {
          const offerToken = this.offerTokens.get(productId);
          if (!offerToken) {
            throw new Error(`Offer token bulunamadı: ${productId}`);
          }

          console.log('📋 Android subscription satın alma:', { productId, offerToken });
          
          await requestPurchase({
            request: {
              android: {
                skus: [productId],
                subscriptionOffers: [{
                  sku: productId,
                  offerToken,
                }],
              }
            },
            type: 'subs'
          });
          
        } else {
          console.log('📋 In-app/iOS satın alma:', productId);
          
          await requestPurchase({
            request: Platform.OS === 'android' ? {
              android: {
                skus: [productId]
              }
            } : {
              ios: {
                sku: productId
              }
            },
            type: 'in-app'
          });
        }

        console.log('🎧 Purchase request gönderildi, event bekleniyor...');
        
      } catch (error: any) {
        console.error('❌ Purchase request hatası:', error);
        
        this.pendingPurchaseResolve = null;
        this.pendingPurchaseReject = null;
        
        let errorMessage = error.message || 'Satın alma işlemi başarısız';

        if (__DEV__) {
          errorMessage = `Development Build: ${errorMessage}. Production APK/AAB ile test edin.`;
        }

        reject({
          success: false,
          error: errorMessage,
        });
      }
    });
  }

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
      
      if (retryCount < 2) {
        console.log(`🔄 Acknowledge tekrar deneniyor... (${retryCount + 2}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.acknowledgePurchase(purchaseToken, retryCount + 1);
      }
      
      return false;
    }
  }

  async validatePurchaseWithBackend(
    purchaseToken: string, 
    productId: string, 
    packageId: string
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    console.log('🔍 ===== BACKEND DOĞRULAMA BAŞLADI =====');

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('❌ Kullanıcı oturumu bulunamadı');
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' };
      }

      console.log('🚀 Supabase RPC çağrılıyor: validate_google_play_purchase');
      const rpcParams = {
        p_user_id: user.user.id,
        p_package_id: packageId,
        p_purchase_token: purchaseToken,
        p_product_id: productId
      };

      const { data, error } = await supabase.rpc('validate_google_play_purchase', rpcParams);

      const responseTime = Date.now() - startTime;
      console.log('⏱️ Backend response süresi:', responseTime + 'ms');

      if (error) {
        console.error('❌ Backend doğrulama RPC hatası:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Backend doğrulama response:', JSON.stringify(data, null, 2));
      console.log('🎉 ===== BACKEND DOĞRULAMA TAMAMLANDI =====');
      
      return { success: true };
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error('❌ ===== BACKEND DOĞRULAMA HATASI =====');
      console.error('⏱️ Hata süresi:', errorTime + 'ms');
      console.error('�  Backend doğrulama hatası:', error);
      return { success: false, error: error.message || 'Backend doğrulama başarısız' };
    }
  }

  async validatePurchase(transactionId: string, productId: string): Promise<boolean> {
    try {
      console.log('🔍 Satın alma doğrulanıyor:', { transactionId, productId });
      
      if (__DEV__) {
        console.log('🔧 Development modunda - validation bypass');
        return true;
      }

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
      console.log('🔍 Satın alma detayları:', purchases.map(p => ({
        productId: p.productId,
        transactionId: p.transactionId,
        purchaseToken: (p as any).purchaseToken,
        purchaseTime: (p as any).transactionDate || (p as any).purchaseTime,
        acknowledged: (p as any).isAcknowledgedAndroid || (p as any).acknowledged
      })));
      
      const results: RestorePurchaseResult[] = purchases.map((purchase: any) => {
        // Android ve iOS için farklı field'ları kontrol et
        const transactionId = purchase.transactionId || (purchase as any).purchaseToken || '';
        const productId = purchase.productId || '';
        const purchaseToken = (purchase as any).purchaseToken || purchase.transactionId || '';
        
        console.log('✅ Geri yüklenen satın alma:', {
          productId,
          transactionId: transactionId.substring(0, 20) + '...',
          purchaseToken: purchaseToken.substring(0, 20) + '...',
          purchaseTime: (purchase as any).transactionDate || (purchase as any).purchaseTime,
          platform: Platform.OS
        });
        
        return {
          success: true,
          transactionId,
          productId,
          purchaseToken, // Purchase token'ı da ekle
        };
      });

      console.log(`🎉 ${results.length} satın alma başarıyla geri yüklendi`);
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
      // Event listener'ları temizle
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }
      
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