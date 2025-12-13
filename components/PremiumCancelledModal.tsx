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
import { CheckCircle, Calendar, Shield, Crown, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PremiumCancelledModalProps {
  visible: boolean;
  onClose: () => void;
  expiryDate?: string;
}

export default function PremiumCancelledModal({ 
  visible, 
  onClose,
  expiryDate
}: PremiumCancelledModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const checkAnim = new Animated.Value(0);
  const sparkleAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    if (visible) {
      // Main entrance
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
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Check animation sequence
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(checkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
      ]).start();

      // Subtle sparkle animation
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

      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      checkAnim.setValue(0);
      sparkleAnim.setValue(0);
      slideAnim.setValue(30);
    }
  }, [visible]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <BlurView intensity={15} style={styles.overlay}>
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
            <Sparkles size={16} color="#10B981" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle2,
              { opacity: Animated.subtract(1, sparkleAnim) }
            ]}
          >
            <Sparkles size={14} color="#6B7280" />
          </Animated.View>

          {/* Main Modal */}
          <View style={styles.modal}>
            {/* Success Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                { 
                  transform: [{ scale: checkAnim }],
                  opacity: checkAnim
                }
              ]}
            >
              <View style={styles.checkContainer}>
                <CheckCircle size={64} color="#10B981" fill="#10B981" />
              </View>
            </Animated.View>

            {/* Content */}
            <Animated.View 
              style={[
                styles.content,
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              <Text style={styles.title}>Abonelik İptal Edildi</Text>
              <Text style={styles.subtitle}>
                Premium aboneliğiniz başarıyla iptal edildi
              </Text>

              {/* Info Cards */}
              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <Calendar size={20} color="#8B5CF6" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Premium Hakları</Text>
                    <Text style={styles.infoText}>
                      {expiryDate ? `${formatDate(expiryDate)} tarihine kadar aktif` : 'Mevcut dönem sonuna kadar devam eder'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <Shield size={20} color="#10B981" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Güvence</Text>
                    <Text style={styles.infoText}>
                      İstediğiniz zaman tekrar premium olabilirsiniz
                    </Text>
                  </View>
                </View>
              </View>

              {/* Features Notice */}
              <View style={styles.featuresNotice}>
                <View style={styles.featuresHeader}>
                  <Crown size={16} color="#F59E0B" />
                  <Text style={styles.featuresTitle}>Şu an aktif olan özellikler:</Text>
                </View>
                <View style={styles.featuresList}>
                  <Text style={styles.featureItem}>• Sınırsız teklif gönderme</Text>
                  <Text style={styles.featureItem}>• Günlük super like hakkı</Text>
                  <Text style={styles.featureItem}>• Gelişmiş filtreleme</Text>
                  <Text style={styles.featureItem}>• Öncelikli görünüm</Text>
                </View>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={onClose}
              >
                <Text style={styles.ctaText}>Anladım</Text>
              </TouchableOpacity>
            </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    width: width - 64,
    maxWidth: 360,
    position: 'relative',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
  sparkle1: {
    top: 30,
    right: 40,
  },
  sparkle2: {
    bottom: 80,
    left: 30,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  checkContainer: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  infoCards: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  featuresNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  featuresList: {
    gap: 4,
  },
  featureItem: {
    fontSize: 13,
    color: '#A16207',
    lineHeight: 18,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});