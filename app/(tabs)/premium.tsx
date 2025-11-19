import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Zap, Filter, Eye, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PremiumScreen() {
  const { user } = useAuth();

  const features = [
    { icon: Zap, title: 'Sınırsız Teklif', description: 'Günde 5 yerine sınırsız teklif gönder' },
    { icon: Crown, title: 'Profil Boost', description: '30 dakika boyunca öne çıkar' },
    { icon: Eye, title: 'Sınırsız Super Like', description: 'Günde 1 yerine sınırsız super like' },
    { icon: Filter, title: 'Gelişmiş Filtreleme', description: 'Detaylı arama kriterleri' },
  ];

  const plans = [
    { duration: '1 Ay', price: '₺149', value: 149, popular: false },
    { duration: '3 Ay', price: '₺349', value: 349, popular: true, save: '30%' },
    { duration: '12 Ay', price: '₺999', value: 999, popular: false, save: '44%' },
  ];

  const handleSubscribe = async (plan: any) => {
    Alert.alert(
      'Demo Mod',
      'Bu bir demo uygulamasıdır. Gerçek ödeme yapılmayacaktır.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Premium Aktif Et',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ is_premium: true })
                .eq('id', user?.id);

              if (error) throw error;
              Alert.alert('Başarılı', 'Premium üyeliğiniz aktif edildi!');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
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

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Planlar</Text>
          {plans.map((plan, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.planCard, plan.popular && styles.planCardPopular]}
              onPress={() => handleSubscribe(plan)}
              activeOpacity={0.9}
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
                    <Text style={styles.planSave}>{plan.save} Tasarruf</Text>
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

        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            Premium üyeliğiniz otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
          </Text>
        </View>
      </ScrollView>
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
});
