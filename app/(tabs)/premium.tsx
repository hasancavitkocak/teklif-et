import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Filter, Eye, Check, Sparkles, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { packagesAPI, type Package, type PackagePurchase, type UserCredit } from '@/api/packages';
import { purchaseService, type PurchaseProduct } from '@/services/PurchaseService';
import PremiumSubscriptionModal from '@/components/PremiumSubscriptionModal';
import PremiumCancelModal from '@/components/PremiumCancelModal';
import PremiumSuccessModal from '@/components/PremiumSuccessModal';
import PremiumCancelledModal from '@/components/PremiumCancelledModal';
import PackagePurchaseSuccessModal from '@/components/PackagePurchaseSuccessModal';
import ErrorToast from '@/components/ErrorToast';
import RestoreInfoModal from '@/components/RestoreInfoModal';

const { width } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  { icon: Eye, title: 'Günde 5 Teklif', description: 'Günde 1 teklif yerine 5 teklif oluştur' },
  { icon: Sparkles, title: 'Günde 3 Super Like', description: 'Günde 1 super like yerine 3 super like gönder' },
  { icon: Crown, title: 'Sınırsız Eşleşme İsteği', description: 'Günde 10 eşleşme isteği yerine sınırsız eşleşme isteği' },
  { icon: Filter, title: 'Gelişmiş Filtreleme', description: 'Yaş, konum ve diğer detaylı filtreler' },
];

export default function PremiumScreen() {
  const { user, refreshPremiumStatus, isPremium } = useAuth();
  const router = useRouter();
  
  // State declarations - all at once to maintain hook order
  const [subscription, setSubscription] = useState<PackagePurchase | null>(null);
  const [subscriptionPackages, setSubscriptionPackages] = useState<Package[]>([]);
  const [addonPackages, setAddonPackages] = useState<Package[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [cancelledModalVisible, setCancelledModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Package | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'addons'>('plans');
  const [packageSuccessModalVisible, setPackageSuccessModalVisible] = useState(false);
  const [purchasedPackage, setPurchasedPackage] = useState<Package | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [storeProducts, setStoreProducts] = useState<PurchaseProduct[]>([]);
  const [purchaseInitialized, setPurchaseInitialized] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error'
  });

  // Load data function
  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      // Initialize purchase service
      if (!purchaseInitialized) {
        const initialized = await purchaseService.initialize();
        if (initialized) {
          const products = await purchaseService.getProducts();
          setStoreProducts(products);
          setPurchaseInitialized(true);
          console.log('🏪 Store ürünleri yüklendi:', products.length);
          console.log('📋 Store ürün detayları:', products.map(p => ({
            id: p.productId,
            price: p.localizedPrice,
            title: p.title
          })));
        }
      }

      // Load packages
      const [subscriptions, addons, activeSubscription, credits] = await Promise.all([
        packagesAPI.getSubscriptionPackages(),
        packagesAPI.getAddonPackages(),
        packagesAPI.getActiveSubscription(),
        packagesAPI.getUserCredits()
      ]);

      setSubscriptionPackages(subscriptions);
      setAddonPackages(addons);
      setSubscription(activeSubscription);
      setUserCredits(credits);
      setDataLoaded(true);

      console.log('📦 Paketler yüklendi:', {
        subscriptions: subscriptions.length,
        addons: addons.length,
        activeSubscription: !!activeSubscription,
        credits: credits.length
      });
    } catch (error) {
      console.error('❌ Paket verilerini yükleme hatası:', error);
      setErrorMessage('Paket bilgileri yüklenirken bir hata oluştu');
      setShowErrorToast(true);
    }
  };

  // Load packages and subscription data on mount
  useEffect(() => {
    if (user?.id) {
      loadData();
    }

    // Cleanup - disconnect purchase service on unmount
    return () => {
      if (purchaseInitialized) {
        purchaseService.disconnect();
      }
    };
  }, [user?.id]);

  // Premium kullanıcılar için varsayılan tab'ı addons yap
  useEffect(() => {
    if (isPremium) {
      setActiveTab('addons');
    }
  }, [isPremium]);

  const handleSubscribe = (plan: Package) => {
    setSelectedPlan(plan);
    setSubscriptionModalVisible(true);
  };

  // Paket tipine göre store product ID'sini belirle
  const getStoreProductId = (packageData: Package): string => {
    if (packageData.duration_type === 'weekly') {
      return purchaseService.PRODUCTS.PREMIUM_WEEKLY;
    } else if (packageData.duration_type === 'yearly') {
      return purchaseService.PRODUCTS.PREMIUM_YEARLY;
    } else if (packageData.category === 'super_like') {
      if (packageData.credits_amount === 5) return purchaseService.PRODUCTS.SUPER_LIKE_5;
      if (packageData.credits_amount === 10) return purchaseService.PRODUCTS.SUPER_LIKE_10;
    } else if (packageData.category === 'boost') {
      if (packageData.credits_amount === 3) return purchaseService.PRODUCTS.BOOST_3;
    }
    return purchaseService.PRODUCTS.PREMIUM_MONTHLY;
  };

  const confirmSubscription = async () => {
    if (!selectedPlan || !user?.id) return;
    
    setLoading(true);
    try {
      // Store'dan satın alma işlemi
      const storeProductId = getStoreProductId(selectedPlan);
      const purchaseResult = await purchaseService.purchaseProduct(storeProductId);
      
      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Satın alma işlemi başarısız');
      }

      // Satın almayı doğrula (production'da backend validation)
      const isValid = await purchaseService.validatePurchase(
        purchaseResult.transactionId || '',
        purchaseResult.productId || ''
      );

      if (!isValid) {
        throw new Error('Satın alma doğrulanamadı');
      }

      // Google Play Store satın almasını backend'e kaydet
      const result = await packagesAPI.recordGooglePlayPurchase(
        selectedPlan.id,
        purchaseResult.transactionId || '',
        'purchase_token_placeholder', // Gerçek purchase token buraya gelecek
        storeProductId
      );

      if (!result.success) {
        throw new Error(result.error || 'Satın alma kaydedilemedi');
      }
      
      // Refresh data
      await refreshPremiumStatus();
      await loadData();
      
      // Close subscription modal and show success
      setSubscriptionModalVisible(false);
      setSuccessModalVisible(true);
      
    } catch (error: any) {
      setErrorMessage(error.message || 'Abonelik oluşturulamadı');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    setCancelModalVisible(true);
  };

  const handlePurchaseAddon = async (addon: Package) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Store'dan satın alma işlemi
      const storeProductId = getStoreProductId(addon);
      const purchaseResult = await purchaseService.purchaseProduct(storeProductId);
      
      if (!purchaseResult.success) {
        throw new Error(purchaseResult.error || 'Satın alma işlemi başarısız');
      }

      // Satın almayı doğrula (production'da backend validation)
      const isValid = await purchaseService.validatePurchase(
        purchaseResult.transactionId || '',
        purchaseResult.productId || ''
      );

      if (!isValid) {
        throw new Error('Satın alma doğrulanamadı');
      }

      // Google Play Store satın almasını backend'e kaydet
      const result = await packagesAPI.recordGooglePlayPurchase(
        addon.id,
        purchaseResult.transactionId || '',
        'purchase_token_placeholder', // Gerçek purchase token buraya gelecek
        storeProductId
      );

      if (!result.success) {
        throw new Error(result.error || 'Satın alma kaydedilemedi');
      }

      // Refresh data
      await loadData();
      await refreshPremiumStatus();
      
      // Show success modal
      setPurchasedPackage(addon);
      setPackageSuccessModalVisible(true);
      
    } catch (error: any) {
      setErrorMessage(error.message || 'Satın alma işlemi başarısız oldu');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelSubscription = async () => {
    if (!subscription) return;
    
    setLoading(true);
    try {
      const result = await packagesAPI.cancelSubscription(subscription.id);

      if (!result.success) {
        throw new Error(result.error || 'Abonelik iptal edilemedi');
      }
      
      await loadData();
      setCancelModalVisible(false);
      setCancelledModalVisible(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Abonelik iptal edilemedi');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      const restoredPurchases = await purchaseService.restorePurchases();
      
      if (restoredPurchases.length === 0) {
        setRestoreModalData({
          title: 'Bilgi',
          message: 'Geri yüklenecek satın alma bulunamadı. Daha önce bu hesapla satın alma yapmadıysanız bu normal bir durumdur.',
          type: 'info'
        });
        setRestoreModalVisible(true);
        return;
      }

      // Başarılı satın almaları say
      const successfulPurchases = restoredPurchases.filter(p => p.success);
      
      if (successfulPurchases.length > 0) {
        // Her geri yüklenen satın alma için backend'i güncelle
        for (const purchase of successfulPurchases) {
          if (purchase.transactionId && purchase.productId) {
            console.log('🔄 Geri yüklenen satın alma:', purchase);
            // Burada backend'e bildirim gönderebilirsiniz
          }
        }

        await refreshPremiumStatus();
        await loadData();
        
        setRestoreModalData({
          title: 'Başarılı',
          message: `${successfulPurchases.length} satın alma başarıyla geri yüklendi. Premium özellikleriniz aktif edildi.`,
          type: 'success'
        });
        setRestoreModalVisible(true);
      } else {
        setRestoreModalData({
          title: 'Hata',
          message: 'Satın almalar geri yüklenemedi. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
          type: 'error'
        });
        setRestoreModalVisible(true);
      }
    } catch (error: any) {
      setRestoreModalData({
        title: 'Hata',
        message: error.message || 'Satın almalar geri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        type: 'error'
      });
      setRestoreModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.header}>
        <View style={styles.headerContent}>
          <Crown size={40} color="#FFF" fill="#FFF" />
          <Text style={styles.headerTitle}>Premium</Text>
          <Text style={styles.headerSubtitle}>Sınırsız olanaklara kavuş</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Current Subscription Status */}
        {isPremium && subscription && (
          <View style={styles.currentSubscriptionSection}>
            <Text style={styles.sectionTitle}>Mevcut Abonelik</Text>
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <Crown size={24} color="#8B5CF6" fill="#8B5CF6" />
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionType}>
                    {subscription.purchase_type === 'subscription' ? 
                      'Premium Abonelik' : 'Premium'
                    }
                  </Text>
                  <Text style={styles.subscriptionExpiry}>
                    {subscription.expires_at ? 
                      new Date(subscription.expires_at).toLocaleDateString('tr-TR') + ' tarihine kadar aktif' :
                      'Süresiz aktif'
                    }
                  </Text>
                  {subscription.cancelled_at && (
                    <Text style={styles.subscriptionCancelled}>
                      İptal edildi - Dönem sonuna kadar aktif kalacak
                    </Text>
                  )}
                </View>
              </View>
              
              {subscription.auto_renew && !subscription.cancelled_at && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                  disabled={loading}
                >
                  <X size={16} color="#EF4444" />
                  <Text style={styles.cancelButtonText}>Aboneliği İptal Et</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Özellikler</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <feature.icon size={24} color="#8B5CF6" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tab Navigation */}
        {!isPremium && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'plans' && styles.tabButtonActive]}
              onPress={() => setActiveTab('plans')}
            >
              <Crown size={20} color={activeTab === 'plans' ? '#8B5CF6' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>
                Planlar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'addons' && styles.tabButtonActive]}
              onPress={() => setActiveTab('addons')}
            >
              <Sparkles size={20} color={activeTab === 'addons' ? '#8B5CF6' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'addons' && styles.tabTextActive]}>
                Ek Paketler
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Content */}
        {activeTab === 'plans' && !isPremium && dataLoaded && (
          <View style={styles.plansSection}>
            {subscriptionPackages.length > 0 ? subscriptionPackages.map((plan, index) => {
              const storeProduct = storeProducts.find(p => p.productId === getStoreProductId(plan));
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, plan.is_popular && styles.planCardPopular]}
                  onPress={() => handleSubscribe(plan)}
                  activeOpacity={0.9}
                  disabled={loading}
                >
                  {plan.is_popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>EN POPÜLER</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={styles.planDuration}>{plan.name}</Text>
                      {plan.features.includes('33% Tasarruf') && (
                        <Text style={styles.planSave}>33% Tasarruf</Text>
                      )}
                      {plan.features.includes('44% Tasarruf') && (
                        <Text style={styles.planSave}>44% Tasarruf</Text>
                      )}
                      {plan.duration_type === 'weekly' && storeProduct && (
                        <Text style={styles.planPerMonth}>
                          ₺{Math.round(parseFloat(storeProduct.price) * 4)}/ay
                        </Text>
                      )}
                      {plan.duration_type === 'yearly' && storeProduct && (
                        <Text style={styles.planPerMonth}>
                          ₺{Math.round(parseFloat(storeProduct.price) / 12)}/ay
                        </Text>
                      )}
                      {plan.duration_type === 'weekly' && !storeProduct && (
                        <Text style={styles.planPerMonth}>₺{Math.round(plan.price_amount * 4 / 100)}/ay</Text>
                      )}
                      {plan.duration_type === 'yearly' && !storeProduct && (
                        <Text style={styles.planPerMonth}>₺{Math.round(plan.price_amount / 12 / 100)}/ay</Text>
                      )}
                    </View>
                    <Text style={styles.planPrice}>
                      {storeProduct?.localizedPrice || '₺39,99'}
                    </Text>
                    {/* Debug: Play Store verisi */}
                    {storeProduct && (
                      <Text style={[styles.planFeatureText, { fontSize: 10, color: '#666', marginTop: 4 }]}>
                        Store: {storeProduct.productId} - {storeProduct.localizedPrice}
                      </Text>
                    )}
                  </View>
                  <View style={styles.planFeatures}>
                    <View style={styles.planFeatureRow}>
                      <Check size={16} color="#10B981" />
                      <Text style={styles.planFeatureText}>Tüm premium özellikler</Text>
                    </View>
                    <View style={styles.planFeatureRow}>
                      <Check size={16} color="#10B981" />
                      <Text style={styles.planFeatureText}>İstediğin zaman iptal et</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Planlar yükleniyor...</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'addons' && dataLoaded && (
          <View style={styles.addOnsSection}>
            <Text style={styles.addOnsSubtitle}>
              İhtiyacınız olan özellikleri tek seferlik satın alın
            </Text>
          
            {/* User Credits Display */}
            {userCredits.length > 0 && (
              <View style={styles.creditsSection}>
                <Text style={styles.creditsTitle}>Mevcut Kredileriniz</Text>
                {userCredits.map((credit, index) => (
                  <View key={index} style={styles.creditItem}>
                    <Text style={styles.creditType}>
                      {credit.credit_type === 'super_like' ? 'Super Like' :
                       credit.credit_type === 'boost' ? 'Boost' : 'Diğer'}
                    </Text>
                    <Text style={styles.creditAmount}>{credit.amount} adet</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Addon Packages */}
            {addonPackages.length > 0 ? addonPackages.map((addon, index) => {
              const storeProduct = storeProducts.find(p => p.productId === getStoreProductId(addon));
              
              return (
                <TouchableOpacity 
                  key={addon.id}
                  style={[styles.addOnCard, loading && { opacity: 0.6 }]} 
                  activeOpacity={0.9}
                  onPress={() => handlePurchaseAddon(addon)}
                  disabled={loading}
                >
                  <View style={[styles.addOnIcon, {
                    backgroundColor: addon.category === 'super_like' ? '#FEF3C7' :
                                    addon.category === 'boost' ? '#FEF3C7' : '#DBEAFE'
                  }]}>
                    {addon.category === 'super_like' && <Sparkles size={24} color="#F59E0B" fill="#F59E0B" />}
                    {addon.category === 'boost' && <Crown size={24} color="#F59E0B" />}
                  </View>
                  <View style={styles.addOnContent}>
                    <Text style={styles.addOnTitle}>{addon.name}</Text>
                    <Text style={styles.addOnDescription}>{addon.description}</Text>
                    {addon.credits_amount && (
                      <Text style={styles.addOnSubtext}>{addon.credits_amount} adet kredi</Text>
                    )}
                  </View>
                  <View style={styles.addOnPricing}>
                    <Text style={styles.addOnPrice}>
                      {storeProduct?.localizedPrice || '₺39,99'}
                    </Text>
                    <Text style={styles.addOnPriceUnit}>
                      {addon.duration_type === 'one_time' ? 'tek seferlik' : 
                       addon.duration_type === 'weekly' ? '7 günlük' : 'aylık'}
                    </Text>
                    {/* Debug: Play Store verisi */}
                    {storeProduct && (
                      <Text style={[styles.addOnPriceUnit, { fontSize: 9, color: '#666' }]}>
                        Store: {storeProduct.productId}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Ek paketler yükleniyor...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.termsSection}>
          <TouchableOpacity
            style={[styles.restoreButton, loading && { opacity: 0.6 }]}
            onPress={handleRestorePurchases}
            disabled={loading}
          >
            <Text style={styles.restoreButtonText}>
              {loading ? 'Geri Yükleniyor...' : 'Satın Almaları Geri Yükle'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            Premium üyeliğiniz otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
            İptal etmediğiniz sürece aboneliğiniz devam edecektir.
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <PremiumSubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        onConfirm={confirmSubscription}
        plan={selectedPlan || (subscriptionPackages.length > 0 ? subscriptionPackages[0] : null)}
        loading={loading}
        storeProduct={selectedPlan ? storeProducts.find(p => p.productId === getStoreProductId(selectedPlan)) : null}
      />

      <PremiumCancelModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={confirmCancelSubscription}
        expiryDate={subscription?.expires_at}
        loading={loading}
      />

      <PremiumSuccessModal
        visible={successModalVisible}
        onClose={() => {
          setSuccessModalVisible(false);
          router.push('/(tabs)');
        }}
        planType={selectedPlan?.duration_type || 'monthly'}
        expiryDate={subscription?.expires_at}
      />

      <PremiumCancelledModal
        visible={cancelledModalVisible}
        onClose={() => setCancelledModalVisible(false)}
        expiryDate={subscription?.expires_at}
      />

      {/* Package Purchase Success Modal */}
      <PackagePurchaseSuccessModal
        visible={packageSuccessModalVisible}
        onClose={() => {
          setPackageSuccessModalVisible(false);
          setPurchasedPackage(null);
        }}
        packageName={purchasedPackage?.name || ''}
        packageCategory={purchasedPackage?.category || ''}
        creditsAmount={purchasedPackage?.credits_amount}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />

      {/* Restore Info Modal */}
      <RestoreInfoModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        title={restoreModalData.title}
        message={restoreModalData.message}
        type={restoreModalData.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  featuresSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  plansSection: {
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardPopular: {
    borderColor: '#8B5CF6',
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  planSave: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  planFeatures: {
    gap: 8,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#6B7280',
  },
  termsSection: {
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  // Current Subscription Styles
  currentSubscriptionSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  subscriptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  subscriptionType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subscriptionExpiry: {
    fontSize: 14,
    color: '#6B7280',
  },
  subscriptionCancelled: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  planPerMonth: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Add-ons Styles
  addOnsSection: {
    marginBottom: 32,
  },
  addOnsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  addOnCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  addOnIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FEF3C7',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addOnContent: {
    flex: 1,
  },
  addOnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  addOnDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  addOnSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  addOnPricing: {
    alignItems: 'flex-end',
  },
  addOnPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  addOnPriceUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  // Credits Styles
  creditsSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  creditsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  creditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  creditType: {
    fontSize: 14,
    color: '#6B7280',
  },
  creditAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Empty State Styles
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Restore Button Styles
  restoreButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
