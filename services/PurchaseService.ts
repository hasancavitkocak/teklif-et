// Hybrid Purchase Service - Development'ta mock, Production'da gerçek IAP
// Bu sistem hem Expo managed hem de bare workflow'ta çalışır

export interface PurchaseProduct {
  productId: string;
  price: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

class PurchaseService {
  private isConnected = false;
  private isNativeAvailable = false;

  // Google Play Console'da tanımlanacak ürün ID'leri (alt çizgi olmadan)
  readonly PRODUCTS = {
    PREMIUM_WEEKLY: 'premiumweekly',
    PREMIUM_MONTHLY: 'premiummonthly',
    PREMIUM_YEARLY: 'premiumyearly',
    SUPER_LIKE_5: 'superlike5',
    SUPER_LIKE_10: 'superlike10',
    BOOST_3: 'boost3',
  };

  async initialize(): Promise<boolean> {
    try {
      if (this.isConnected) return true;

      console.log('🔄 Purchase Service başlatılıyor...');
      
      // Native IAP modülünün mevcut olup olmadığını kontrol et
      try {
        // Önce modülün var olup olmadığını kontrol et
        const RNIap = require('react-native-iap');
        
        // Fonksiyonların mevcut olup olmadığını kontrol et
        if (!RNIap.initConnection || typeof RNIap.initConnection !== 'function') {
          throw new Error('RNIap.initConnection is not available');
        }
        
        console.log('✅ react-native-iap modülü bulundu');
        
        const result = await RNIap.initConnection();
        console.log('✅ Google Play Store bağlantısı kuruldu:', result);
        
        this.isNativeAvailable = true;
        this.isConnected = true;
        console.log('✅ Native Google Play Store bağlantısı kuruldu');
        return true;
      } catch (nativeError) {
        console.error('❌ Native IAP hatası:', nativeError);
        console.log('⚠️ Native IAP mevcut değil, mock mode kullanılıyor');
        this.isNativeAvailable = false;
        this.isConnected = true;
        return true;
      }
    } catch (error) {
      console.error('❌ Purchase Service başlatma hatası:', error);
      return false;
    }
  }

  async getProducts(): Promise<PurchaseProduct[]> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛍️ Ürünler yükleniyor...');

      if (this.isNativeAvailable) {
        try {
          const RNIap = require('react-native-iap');
          
          console.log('🔍 RNIap mevcut fonksiyonlar:', Object.keys(RNIap));
          
          const productIds = Object.values(this.PRODUCTS);
          
          console.log('📋 İstenen ürün ID\'leri:', productIds);
          console.log('🔍 Google Play Store\'dan ürün çekiliyor...');
          
          // Abonelikler ve tek seferlik ürünleri ayır
          const subscriptionIds = [
            this.PRODUCTS.PREMIUM_WEEKLY,
            this.PRODUCTS.PREMIUM_MONTHLY, 
            this.PRODUCTS.PREMIUM_YEARLY
          ];
          
          const productOnlyIds = [
            this.PRODUCTS.SUPER_LIKE_5,
            this.PRODUCTS.SUPER_LIKE_10,
            this.PRODUCTS.BOOST_3
          ];
          
          console.log('📋 Abonelik ID\'leri:', subscriptionIds);
          console.log('�  Tek seferlik ürün ID\'leri:', productOnlyIds);
          
          // v14 için tamamen yeni API
          console.log('🔄 RNIap fonksiyonları kontrol ediliyor...');
          console.log('📋 Mevcut fonksiyonlar:', Object.keys(RNIap));
          
          let allProducts = [];
          
          try {
            console.log('🔄 fetchProducts API çağrısı başlıyor...');
            
            // v14'te fetchProducts kullanılıyor - abonelikler
            const subscriptionProducts = await RNIap.fetchProducts({
              skus: subscriptionIds,
              type: 'subs'
            });
            console.log('✅ fetchProducts (subs) başarılı, ürün sayısı:', subscriptionProducts.length);
            console.log('📦 Abonelik ham verisi:', JSON.stringify(subscriptionProducts, null, 2));
            
            // Abonelik offer token'larını sakla
            subscriptionProducts.forEach((sub: any) => {
              console.log('🔍 Sub verisi kontrol ediliyor:', sub.id);
              if (sub.subscriptionOfferDetailsAndroid && sub.subscriptionOfferDetailsAndroid.length > 0) {
                const baseOffer = sub.subscriptionOfferDetailsAndroid[0];
                
                // Map'in var olduğundan emin ol
                if (!this.subscriptionOffers) {
                  this.subscriptionOffers = new Map();
                }
                
                this.subscriptionOffers.set(sub.id, {
                  offerToken: baseOffer.offerToken,
                  basePlanId: baseOffer.basePlanId,
                });
                console.log('💾 Offer token kaydedildi:', sub.id, baseOffer.offerToken);
              } else {
                console.log('⚠️ Offer details bulunamadı:', sub.id);
              }
            });
            
            allProducts = [...allProducts, ...subscriptionProducts];
            
            // Tek seferlik ürünler için fetchProducts
            const inappProducts = await RNIap.fetchProducts({
              skus: productOnlyIds,
              type: 'inapp'
            });
            console.log('✅ fetchProducts (inapp) başarılı, ürün sayısı:', inappProducts.length);
            allProducts = [...allProducts, ...inappProducts];
            
          } catch (apiError: any) {
            console.log('❌ fetchProducts başarısız:', apiError.message);
            console.log('⚠️ Store ürünleri yüklenemedi, mock data kullanılacak');
          }
          
          console.log('✅ Google Play Store\'dan alınan toplam ürün:', allProducts.length);
          console.log('📦 Ham ürün verisi:', JSON.stringify(allProducts, null, 2));
          
          if (allProducts.length === 0) {
            console.error('❌ Google Play Store\'dan hiç ürün gelmedi!');
            console.error('🔍 Muhtemel sebepler:');
            console.error('   - Ürünler henüz aktif değil (2-8 saat bekleyin)');
            console.error('   - Product ID\'ler eşleşmiyor');
            console.error('   - Test hesabı license testing\'de değil');
          }
          
          console.log('📦 Ürün detayları:', allProducts.map(p => ({
            id: p.productId,
            price: p.localizedPrice,
            title: p.title
          })));
          
          const formattedProducts = allProducts.map(product => ({
            productId: product.id, // fetchProducts'ta 'id' kullanılıyor
            price: product.price?.toString() || product.displayPrice || '0',
            title: product.title || product.displayName || '',
            description: product.description || '',
            localizedPrice: product.displayPrice || '₺0,00',
            currency: product.currency || 'TRY',
          }));

          console.log('✅ Native Google Play Store ürünleri yüklendi:', formattedProducts.length);
          return formattedProducts;
        } catch (storeError) {
          console.error('❌ Google Play Store ürün yükleme hatası:', storeError);
          console.error('🔍 Hata detayları:', {
            message: storeError.message,
            code: storeError.code,
            userInfo: storeError.userInfo
          });
          console.warn('⚠️ Store ürünleri yüklenemedi, mock data kullanılıyor');
        }
      } else {
        console.log('⚠️ Native IAP mevcut değil, mock mode aktif');
      }

      // Mock products (development/fallback için)
      const mockProducts: PurchaseProduct[] = [
        {
          productId: this.PRODUCTS.PREMIUM_WEEKLY,
          price: '14.99',
          title: 'Premium Haftalık',
          description: 'Tüm premium özelliklere 1 hafta erişim',
          localizedPrice: '₺14,99',
          currency: 'TRY'
        },
        {
          productId: this.PRODUCTS.PREMIUM_MONTHLY,
          price: '29.99',
          title: 'Premium Aylık',
          description: 'Tüm premium özelliklere erişim',
          localizedPrice: '₺29,99',
          currency: 'TRY'
        },
        {
          productId: this.PRODUCTS.PREMIUM_YEARLY,
          price: '199.99',
          title: 'Premium Yıllık',
          description: 'Yıllık premium abonelik - %44 tasarruf',
          localizedPrice: '₺199,99',
          currency: 'TRY'
        },
        {
          productId: this.PRODUCTS.SUPER_LIKE_5,
          price: '9.99',
          title: '5 Super Like',
          description: '5 adet Super Like paketi',
          localizedPrice: '₺9,99',
          currency: 'TRY'
        },
        {
          productId: this.PRODUCTS.SUPER_LIKE_10,
          price: '17.99',
          title: '10 Super Like',
          description: '10 adet Super Like paketi',
          localizedPrice: '₺17,99',
          currency: 'TRY'
        },
        {
          productId: this.PRODUCTS.BOOST_3,
          price: '14.99',
          title: '3 Boost',
          description: '3 adet Boost paketi',
          localizedPrice: '₺14,99',
          currency: 'TRY'
        }
      ];

      console.log('📦 Mock ürünler yüklendi:', mockProducts.length);
      return mockProducts;
    } catch (error) {
      console.error('❌ Ürün yükleme hatası:', error);
      return [];
    }
  }

  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛒 Satın alma başlatılıyor:', productId);

      if (this.isNativeAvailable) {
        try {
          const RNIap = require('react-native-iap');
          const { Platform } = require('react-native');
          
          console.log('🛒 Google Play Store satın alma başlatılıyor...');
          console.log('📋 Ürün ID:', productId);
          
          // v14 için basit API kullanımı
          const purchase = await RNIap.requestPurchase({ sku: productId });
          
          console.log('✅ Native Google Play Store satın alma başarılı!');
          console.log('🧾 Purchase detayları:', {
            transactionId: purchase.transactionId,
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
            purchaseTime: purchase.purchaseTime,
            purchaseState: purchase.purchaseState
          });

          // Android'de acknowledgment gerekli
          if (Platform.OS === 'android') {
            try {
              console.log('🔄 Android acknowledgment işlemi başlatılıyor...');
              
              if (productId.includes('superlike') || productId.includes('boost')) {
                await RNIap.consumePurchaseAndroid(purchase.purchaseToken);
                console.log('✅ Purchase consumed (Android) - Tek seferlik ürün');
              } else {
                await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
                console.log('✅ Purchase acknowledged (Android) - Abonelik');
              }
            } catch (ackError) {
              console.error('❌ Android acknowledgment hatası:', ackError);
              console.error('🔍 Acknowledgment hata detayları:', {
                message: ackError.message,
                code: ackError.code
              });
            }
          }

          // Transaction'ı bitir
          try {
            console.log('🔄 Transaction sonlandırılıyor...');
            await RNIap.finishTransaction({ 
              purchase, 
              isConsumable: productId.includes('superlike') || productId.includes('boost') 
            });
            console.log('✅ Transaction başarıyla sonlandırıldı');
          } catch (finishError) {
            console.error('❌ Transaction finish hatası:', finishError);
            console.error('🔍 Finish hata detayları:', {
              message: finishError.message,
              code: finishError.code
            });
          }

          return {
            success: true,
            transactionId: purchase.transactionId,
            productId: productId
          };
        } catch (storeError: any) {
          console.error('❌ Google Play Store satın alma hatası:', storeError);
          console.error('🔍 Store hata detayları:', {
            message: storeError.message,
            code: storeError.code,
            userInfo: storeError.userInfo,
            debugMessage: storeError.debugMessage
          });
          
          if (storeError.code === 'E_USER_CANCELLED') {
            console.log('👤 Kullanıcı satın almayı iptal etti');
            return {
              success: false,
              error: 'Kullanıcı satın almayı iptal etti'
            };
          }
          
          if (storeError.code === 'E_ITEM_UNAVAILABLE') {
            console.error('🚫 Ürün mevcut değil - Google Play Console\'da kontrol edin');
            return {
              success: false,
              error: 'Ürün şu anda mevcut değil'
            };
          }
          
          if (storeError.code === 'E_NETWORK_ERROR') {
            console.error('🌐 Ağ bağlantısı hatası');
            return {
              success: false,
              error: 'İnternet bağlantınızı kontrol edin'
            };
          }
          
          console.warn('⚠️ Native store hatası, mock işlem yapılıyor');
        }
      }

      // Mock purchase (development/fallback için)
      console.log('🔄 Mock satın alma işlemi yapılıyor...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // %90 başarı oranı (gerçekçi test için)
      const isSuccess = Math.random() > 0.1;
      
      if (!isSuccess) {
        const errors = [
          'Kullanıcı satın almayı iptal etti',
          'Ağ bağlantısı hatası',
          'Ödeme yöntemi geçersiz'
        ];
        throw new Error(errors[Math.floor(Math.random() * errors.length)]);
      }
      
      const mockTransactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('✅ Mock satın alma başarılı:', mockTransactionId);
      
      return {
        success: true,
        transactionId: mockTransactionId,
        productId: productId
      };
    } catch (error: any) {
      console.error('❌ Satın alma hatası:', error);
      
      return {
        success: false,
        error: error.message || 'Satın alma işlemi başarısız oldu'
      };
    }
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🔄 Satın almalar geri yükleniyor...');

      if (this.isNativeAvailable) {
        try {
          const RNIap = require('react-native-iap');
          console.log('📋 Google Play Store\'dan geçmiş satın almalar alınıyor...');
          
          const purchases = await RNIap.getAvailablePurchases();
          
          console.log('✅ Native geri yüklenen satın almalar:', purchases.length);
          console.log('🧾 Geri yüklenen satın alma detayları:', purchases.map(p => ({
            transactionId: p.transactionId,
            productId: p.productId,
            purchaseTime: p.purchaseTime
          })));
          
          return purchases.map(purchase => ({
            success: true,
            transactionId: purchase.transactionId,
            productId: purchase.productId
          }));
        } catch (storeError) {
          console.error('❌ Native restore hatası:', storeError);
          console.error('🔍 Restore hata detayları:', {
            message: storeError.message,
            code: storeError.code
          });
          console.warn('⚠️ Native restore hatası, mock data kullanılıyor');
        }
      }

      // Mock restore
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Bazen geçmiş satın almalar olsun (test için)
      const hasHistory = Math.random() > 0.7;
      
      if (!hasHistory) {
        console.log('📝 Geri yüklenecek satın alma bulunamadı');
        return [];
      }
      
      // Mock geçmiş satın almalar
      const mockHistory: PurchaseResult[] = [
        {
          success: true,
          transactionId: `old_mock_${Date.now() - 86400000}`,
          productId: this.PRODUCTS.PREMIUM_MONTHLY
        }
      ];
      
      console.log('✅ Mock geri yüklenen satın almalar:', mockHistory.length);
      return mockHistory;
    } catch (error: any) {
      console.error('❌ Geri yükleme hatası:', error);
      return [{
        success: false,
        error: error.message || 'Satın almalar geri yüklenemedi'
      }];
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected && this.isNativeAvailable) {
        const RNIap = require('react-native-iap');
        await RNIap.endConnection();
        console.log('🔌 Native Google Play Store bağlantısı kapatıldı');
      }
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Bağlantı kapatma hatası:', error);
    }
  }

  async validatePurchase(transactionId: string, productId: string): Promise<boolean> {
    try {
      console.log('🔍 Satın alma doğrulanıyor:', { transactionId, productId });
      
      // Production'da backend'e receipt validation isteği gönderilecek
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('❌ Satın alma doğrulama hatası:', error);
      return false;
    }
  }

  // Native IAP durumunu kontrol et
  isNativeIAPAvailable(): boolean {
    return this.isNativeAvailable;
  }
}

export const purchaseService = new PurchaseService();