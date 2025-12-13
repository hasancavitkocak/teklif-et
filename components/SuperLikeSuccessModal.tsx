import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Zap, Heart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SuperLikeSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

export default function SuperLikeSuccessModal({ 
  visible, 
  onClose,
  userName = 'Bu kişi'
}: SuperLikeSuccessModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const sparkleAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (visible) {
      // Ana animasyon
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

      // Sparkle animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Otomatik kapanma
      const timer = setTimeout(() => {
        onClose();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      sparkleAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

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
              { opacity: sparkleAnim }
            ]}
          >
            <Sparkles size={16} color="#EF4444" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle3,
              { opacity: sparkleAnim }
            ]}
          >
            <Sparkles size={18} color="#8B5CF6" />
          </Animated.View>

          {/* Main Content */}
          <View style={styles.modal}>
            {/* Super Like Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Zap size={48} color="#FFF" fill="#FFF" />
              </LinearGradient>
              
              {/* Pulse Rings */}
              <Animated.View 
                style={[
                  styles.pulseRing,
                  styles.pulseRing1,
                  { 
                    opacity: sparkleAnim,
                    transform: [{ scale: Animated.multiply(sparkleAnim, 1.5) }]
                  }
                ]}
              />
              <Animated.View 
                style={[
                  styles.pulseRing,
                  styles.pulseRing2,
                  { 
                    opacity: Animated.subtract(1, sparkleAnim),
                    transform: [{ scale: Animated.multiply(Animated.subtract(1, sparkleAnim), 2) }]
                  }
                ]}
              />
            </Animated.View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>Süper Beğeni Gönderildi!</Text>
              <Text style={styles.subtitle}>
                {userName}'e özel beğenin ulaştı ⚡
              </Text>
              <Text style={styles.description}>
                Süper beğenin sayesinde öne çıkacaksın!
              </Text>
            </View>

            {/* Heart Animation */}
            <View style={styles.heartsContainer}>
              <Animated.View 
                style={[
                  styles.floatingHeart,
                  styles.heart1,
                  { 
                    opacity: sparkleAnim,
                    transform: [
                      { translateY: Animated.multiply(sparkleAnim, -30) },
                      { scale: sparkleAnim }
                    ]
                  }
                ]}
              >
                <Heart size={16} color="#EF4444" fill="#EF4444" />
              </Animated.View>
              <Animated.View 
                style={[
                  styles.floatingHeart,
                  styles.heart2,
                  { 
                    opacity: Animated.subtract(1, sparkleAnim),
                    transform: [
                      { translateY: Animated.multiply(Animated.subtract(1, sparkleAnim), -25) },
                      { scale: Animated.subtract(1, sparkleAnim) }
                    ]
                  }
                ]}
              >
                <Heart size={14} color="#F59E0B" fill="#F59E0B" />
              </Animated.View>
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
    maxWidth: 320,
    position: 'relative',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
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
    top: 60,
    left: 20,
  },
  sparkle3: {
    bottom: 40,
    right: 20,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#F59E0B',
    top: 0,
    left: 0,
  },
  pulseRing1: {
    borderColor: '#F59E0B',
  },
  pulseRing2: {
    borderColor: '#EF4444',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  heartsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  floatingHeart: {
    position: 'absolute',
  },
  heart1: {
    top: '30%',
    left: '20%',
  },
  heart2: {
    top: '40%',
    right: '25%',
  },
});