import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Filter, Eye, Check, Sparkles, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { packagesAPI, type Package, type PackagePurchase, type UserCredit } from '@/api/packages';
import PremiumSubscriptionModal from '@/components/PremiumSubscriptionModal';
import PremiumCancelModal from '@/components/PremiumCancelModal';
import PremiumSuccessModal from '@/components/PremiumSuccessModal';
import PremiumCancelledModal from '@/components/PremiumCancelledModal';
import PackagePurchaseSuccessModal from '@/components/PackagePurchaseSuccessModal';
import ErrorToast from '@/components/ErrorToast';

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

  // Load data function - memoized to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
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

      console.log('📦 Paketler yüklendi:', {
        subscriptions: subscriptions.length,
        addons: addons.length,
        activeSubscription: !!activeSubscription,
        credits: credits.length
      });
    } catch (error) {
      console.error('❌ Paket verilerini yükleme hatası:', error);
    }
  }, [user?.id]);

  // Load packages and subscription data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubscribe = (plan: Package) => {
    setSelectedPlan(plan);
    setSubscriptionModalVisible(true);
  };

  const confirmSubscription = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      // Mock payment process - always success for now
      const paymentSuccess = true;
      
      if (!paymentSuccess) {
        throw new Error('Ödeme işlemi başarısız oldu');
      }

      // Purchase package via API
      const result = await packagesAPI.purchasePackage(
        selectedPlan.id,
        'test_payment',
        `test_${Date.now()}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Satın alma işlemi başarısız');
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
      // Mock payment process
      const paymentSuccess = true;
      
      if (!paymentSuccess) {
        throw new Error('Ödeme işlemi başarısız oldu');
      }

      // Purchase addon via API
      const result = await packagesAPI.purchasePackage(
        addon.id,
        'test_payment',
        `test_${Date.now()}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Satın alma işlemi başarısız');
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.header}>
        <View style={styles.headerContent}>
          <Crown size={40} color="#FFF" fill="#FFF" />
          <Text style={styles.headerTitle}>Premium</Text>
          <Text style={styles.headerSubtitle}>Sınırsız olanaklara kavuş</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Tab Content */}
        {activeTab === 'plans' && !isPremium && (
          <View style={styles.plansSection}>
            {subscriptionPackages.map((plan, index) => (
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
                    {plan.duration_type === 'weekly' && (
                      <Text style={styles.planPerMonth}>₺{Math.round(plan.price_amount * 4 / 100)}/ay</Text>
                    )}
                    {plan.duration_type === 'yearly' && (
                      <Text style={styles.planPerMonth}>₺{Math.round(plan.price_amount / 12 / 100)}/ay</Text>
                    )}
                  </View>
                  <Text style={styles.planPrice}>₺{Math.round(plan.price_amount / 100)}</Text>
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
            ))}
          </View>
        )}

        {activeTab === 'addons' && (
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
            {addonPackages.map((addon, index) => (
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
                  <Text style={styles.addOnPrice}>₺{Math.round(addon.price_amount / 100)}</Text>
                  <Text style={styles.addOnPriceUnit}>
                    {addon.duration_type === 'one_time' ? 'tek seferlik' : 
                     addon.duration_type === 'weekly' ? '7 günlük' : 'aylık'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.termsSection}>
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
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
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
});
