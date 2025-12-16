import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Filter, Eye, Check, Sparkles, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import PremiumSubscriptionModal from '@/components/PremiumSubscriptionModal';
import PremiumCancelModal from '@/components/PremiumCancelModal';
import PremiumSuccessModal from '@/components/PremiumSuccessModal';
import PremiumCancelledModal from '@/components/PremiumCancelledModal';
import ErrorToast from '@/components/ErrorToast';

interface Subscription {
  id: string;
  plan_type: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
  cancelled_at?: string;
}

export default function PremiumScreen() {
  const { user, refreshPremiumStatus, isPremium } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [cancelledModalVisible, setCancelledModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const features = [
    { icon: Eye, title: 'Günde 5 Teklif', description: 'Günde 1 teklif yerine 5 teklif oluştur' },
    { icon: Sparkles, title: 'Sınırsız Eşleşme İsteği', description: 'Günde 10 eşleşme isteği yerine sınırsız eşleşme isteği' },
    { icon: Crown, title: 'Sınırsız Davet', description: 'Günde 10 davet yerine sınırsız davet' },
    { icon: Filter, title: 'Gelişmiş Filtreleme', description: 'Yaş, konum ve diğer detaylı filtreler' },
  ];

  const plans = [
    { 
      duration: 'Haftalık', 
      price: '₺149', 
      value: 14900, 
      type: 'weekly',
      popular: false,
      perMonth: '₺596/ay'
    },
    { 
      duration: 'Aylık', 
      price: '₺399', 
      value: 39900, 
      type: 'monthly',
      popular: true,
      save: '33% Tasarruf'
    },
    { 
      duration: 'Yıllık', 
      price: '₺3.999', 
      value: 399900, 
      type: 'yearly',
      popular: false, 
      save: '44% Tasarruf',
      perMonth: '₺333/ay'
    },
  ];

  // Load current subscription
  useEffect(() => {
    loadSubscription();
  }, [user?.id]);

  const loadSubscription = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Subscription load error:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Load subscription error:', error);
    }
  };

  const handleSubscribe = (plan: any) => {
    setSelectedPlan(plan);
    setSubscriptionModalVisible(true);
  };

  const confirmSubscription = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      // Mock payment process - always success
      const paymentSuccess = true;
      
      if (!paymentSuccess) {
        throw new Error('Ödeme işlemi başarısız oldu');
      }

      // Create subscription
      const { data, error } = await supabase.rpc('create_premium_subscription', {
        p_user_id: user?.id,
        p_plan_type: selectedPlan.type,
        p_price_amount: selectedPlan.value
      });

      if (error) throw error;
      
      // Refresh premium status and subscription
      await refreshPremiumStatus();
      await loadSubscription();
      
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

  const confirmCancelSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_premium_subscription', {
        p_user_id: user?.id
      });

      if (error) throw error;
      
      if (data) {
        await loadSubscription();
        setCancelModalVisible(false);
        setCancelledModalVisible(true);
      } else {
        setErrorMessage('Aktif abonelik bulunamadı');
        setShowErrorToast(true);
      }
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
                    {subscription.plan_type === 'weekly' ? 'Haftalık' : 
                     subscription.plan_type === 'monthly' ? 'Aylık' : 'Yıllık'} Premium
                  </Text>
                  <Text style={styles.subscriptionExpiry}>
                    {new Date(subscription.end_date).toLocaleDateString('tr-TR')} tarihine kadar aktif
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
          {features.map((feature, index) => (
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

        {!isPremium && (
          <View style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Planlar</Text>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.planCard, plan.popular && styles.planCardPopular]}
                onPress={() => handleSubscribe(plan)}
                activeOpacity={0.9}
                disabled={loading}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>EN POPÜLER</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planDuration}>{plan.duration}</Text>
                    {plan.save && (
                      <Text style={styles.planSave}>{plan.save}</Text>
                    )}
                    {plan.perMonth && (
                      <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
                    )}
                  </View>
                  <Text style={styles.planPrice}>{plan.price}</Text>
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
        plan={selectedPlan || plans[0]}
        loading={loading}
      />

      <PremiumCancelModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={confirmCancelSubscription}
        expiryDate={subscription?.end_date}
        loading={loading}
      />

      <PremiumSuccessModal
        visible={successModalVisible}
        onClose={() => {
          setSuccessModalVisible(false);
          router.push('/(tabs)');
        }}
        planType={selectedPlan?.type || 'monthly'}
        expiryDate={subscription?.end_date}
      />

      <PremiumCancelledModal
        visible={cancelledModalVisible}
        onClose={() => setCancelledModalVisible(false)}
        expiryDate={subscription?.end_date}
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
});
