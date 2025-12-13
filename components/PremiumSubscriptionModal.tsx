import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Crown, Check, X, Sparkles, Heart, Eye, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PremiumSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plan: {
    duration: string;
    price: string;
    type: string;
    save?: string;
    perMonth?: string;
  };
  loading?: boolean;
}

export default function PremiumSubscriptionModal({ 
  visible, 
  onClose,
  onConfirm,
  plan,
  loading = false
}: PremiumSubscriptionModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const sparkleAnim = new Animated.Value(0);
  const crownAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Crown entrance animation
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(crownAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
      ]).start();

      // Sparkle loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
      crownAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <BlurView intensity={20} style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Sparkle Effects */}
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle1,
              { opacity: sparkleAnim }
            ]}
          >
            <Sparkles size={18} color="#F59E0B" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle2,
              { opacity: Animated.subtract(1, sparkleAnim) }
            ]}
          >
            <Sparkles size={16} color="#8B5CF6" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle3,
              { opacity: sparkleAnim }
            ]}
          >
            <Sparkles size={20} color="#EF4444" />
          </Animated.View>

          {/* Main Modal */}
          <View style={styles.modal}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
              disabled={loading}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Crown Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                { 
                  transform: [
                    { scale: crownAnim },
                    { 
                      rotate: crownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-10deg', '0deg'],
                      })
                    }
                  ] 
                }
              ]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7', '#C084FC']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Crown size={48} color="#FFF" fill="#FFF" />
              </LinearGradient>
            </Animated.View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Premium'a Geç</Text>
              
              {/* Plan Info */}
              <View style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                {plan.save && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>{plan.save}</Text>
                  </View>
                )}
                {plan.perMonth && (
                  <Text style={styles.perMonth}>{plan.perMonth}</Text>
                )}
              </View>

              {/* Features */}
              <View style={styles.features}>
                <View style={styles.featureRow}>
                  <Heart size={16} color="#10B981" />
                  <Text style={styles.featureText}>Sınırsız teklif gönder</Text>
                </View>
                <View style={styles.featureRow}>
                  <Sparkles size={16} color="#10B981" />
                  <Text style={styles.featureText}>Günlük 1 super like</Text>
                </View>
                <View style={styles.featureRow}>
                  <Eye size={16} color="#10B981" />
                  <Text style={styles.featureText}>Gelişmiş filtreler</Text>
                </View>
                <View style={styles.featureRow}>
                  <Crown size={16} color="#10B981" />
                  <Text style={styles.featureText}>Öncelikli görünüm</Text>
                </View>
              </View>

              {/* Warning */}
              <View style={styles.warningCard}>
                <AlertCircle size={16} color="#F59E0B" />
                <Text style={styles.warningText}>
                  İptal etmediğiniz sürece aboneliğiniz otomatik olarak yenilenecektir.
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#9CA3AF', '#9CA3AF'] : ['#8B5CF6', '#A855F7']}
                    style={styles.confirmGradient}
                  >
                    <Crown size={20} color="#FFF" />
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'İşleniyor...' : 'Abone Ol'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    width: width - 48,
    maxWidth: 380,
    position: 'relative',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
  sparkle1: {
    top: 20,
    right: 30,
  },
  sparkle2: {
    top: 80,
    left: 20,
  },
  sparkle3: {
    bottom: 60,
    right: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    position: 'relative',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planDuration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  perMonth: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  features: {
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});