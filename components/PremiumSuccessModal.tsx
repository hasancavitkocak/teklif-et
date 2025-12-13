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
import { Crown, Check, Sparkles, Heart, Eye, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PremiumSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  planType: string;
  expiryDate?: string;
}

export default function PremiumSuccessModal({ 
  visible, 
  onClose,
  planType,
  expiryDate
}: PremiumSuccessModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const sparkleAnim = new Animated.Value(0);
  const crownAnim = new Animated.Value(0);
  const checkAnim = new Animated.Value(0);

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
      ]).start();

      // Crown animation sequence
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(crownAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 8,
        }),
        Animated.delay(300),
        Animated.spring(checkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]).start();

      // Continuous sparkle animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
      crownAnim.setValue(0);
      checkAnim.setValue(0);
    }
  }, [visible]);

  const getPlanName = (type: string) => {
    switch (type) {
      case 'weekly': return 'Haftalık';
      case 'monthly': return 'Aylık';
      case 'yearly': return 'Yıllık';
      default: return 'Premium';
    }
  };

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
            <Sparkles size={20} color="#F59E0B" />
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
            <Sparkles size={18} color="#EF4444" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle4,
              { opacity: Animated.subtract(1, sparkleAnim) }
            ]}
          >
            <Sparkles size={14} color="#10B981" />
          </Animated.View>

          {/* Main Modal */}
          <View style={styles.modal}>
            {/* Crown Icon with Check */}
            <View style={styles.iconContainer}>
              <Animated.View 
                style={[
                  styles.crownContainer,
                  { 
                    transform: [
                      { scale: crownAnim },
                      { 
                        rotate: crownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-15deg', '0deg'],
                        })
                      }
                    ] 
                  }
                ]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#C084FC']}
                  style={styles.crownGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Crown size={56} color="#FFF" fill="#FFF" />
                </LinearGradient>
              </Animated.View>

              {/* Success Check */}
              <Animated.View 
                style={[
                  styles.checkContainer,
                  { 
                    transform: [{ scale: checkAnim }],
                    opacity: checkAnim
                  }
                ]}
              >
                <View style={styles.checkCircle}>
                  <Check size={20} color="#FFF" strokeWidth={3} />
                </View>
              </Animated.View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Tebrikler! 🎉</Text>
              <Text style={styles.subtitle}>
                {getPlanName(planType)} Premium aboneliğiniz aktif!
              </Text>
              
              {expiryDate && (
                <Text style={styles.expiryText}>
                  {formatDate(expiryDate)} tarihine kadar geçerli
                </Text>
              )}

              {/* Features Unlocked */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>Aktif Özellikler:</Text>
                <View style={styles.features}>
                  <Animated.View 
                    style={[
                      styles.featureItem,
                      { 
                        opacity: checkAnim,
                        transform: [{ translateX: Animated.multiply(Animated.subtract(1, checkAnim), -20) }]
                      }
                    ]}
                  >
                    <Heart size={16} color="#10B981" />
                    <Text style={styles.featureText}>Sınırsız teklif</Text>
                  </Animated.View>
                  
                  <Animated.View 
                    style={[
                      styles.featureItem,
                      { 
                        opacity: checkAnim,
                        transform: [{ translateX: Animated.multiply(Animated.subtract(1, checkAnim), -20) }]
                      }
                    ]}
                  >
                    <Zap size={16} color="#10B981" />
                    <Text style={styles.featureText}>Günlük super like</Text>
                  </Animated.View>
                  
                  <Animated.View 
                    style={[
                      styles.featureItem,
                      { 
                        opacity: checkAnim,
                        transform: [{ translateX: Animated.multiply(Animated.subtract(1, checkAnim), -20) }]
                      }
                    ]}
                  >
                    <Eye size={16} color="#10B981" />
                    <Text style={styles.featureText}>Gelişmiş filtreler</Text>
                  </Animated.View>
                </View>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={onClose}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Keşfetmeye Başla</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    width: width - 64,
    maxWidth: 340,
    position: 'relative',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
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
  sparkle4: {
    bottom: 100,
    left: 30,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
  },
  crownContainer: {
    position: 'relative',
  },
  crownGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  checkContainer: {
    position: 'absolute',
    bottom: -8,
    right: -8,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  features: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  featureText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '500',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});