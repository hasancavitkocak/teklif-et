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
import { LogOut, X, Shield, Heart, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SignOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function SignOutModal({ 
  visible, 
  onClose,
  onConfirm,
  loading = false
}: SignOutModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const iconAnim = new Animated.Value(0);
  const sparkleAnim = new Animated.Value(0);

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

      // Icon entrance animation
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(iconAnim, {
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
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      iconAnim.setValue(0);
      sparkleAnim.setValue(0);
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
            <Sparkles size={16} color="#F59E0B" />
          </Animated.View>
          <Animated.View 
            style={[
              styles.sparkle,
              styles.sparkle2,
              { opacity: Animated.subtract(1, sparkleAnim) }
            ]}
          >
            <Sparkles size={14} color="#8B5CF6" />
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

            {/* Logout Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                { 
                  transform: [{ scale: iconAnim }],
                  opacity: iconAnim
                }
              ]}
            >
              <View style={styles.logoutIconContainer}>
                <LogOut size={48} color="#EF4444" />
              </View>
            </Animated.View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Çıkış Yapmak İstediğinize Emin misiniz?</Text>
              <Text style={styles.subtitle}>
                Çıkış yaptığınızda tüm oturumunuz sonlanacak
              </Text>

              {/* Info Cards */}
              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <Shield size={20} color="#10B981" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Verileriniz Güvende</Text>
                    <Text style={styles.infoText}>
                      Tüm bilgileriniz güvenle saklanacak
                    </Text>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <Heart size={20} color="#EF4444" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Teklifleriniz Aktif</Text>
                    <Text style={styles.infoText}>
                      Mevcut teklifleriniz aktif kalmaya devam edecek
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Return Notice */}
              <View style={styles.returnNotice}>
                <Text style={styles.returnText}>
                  💡 Aynı telefon numaranızla kolayca geri dönebilirsiniz
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.stayButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.stayGradient}
                  >
                    <Heart size={18} color="#FFF" />
                    <Text style={styles.stayButtonText}>Kalmaya Devam Et</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  <LogOut size={18} color="#EF4444" />
                  <Text style={styles.signOutButtonText}>
                    {loading ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
                  </Text>
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
    top: 30,
    right: 40,
  },
  sparkle2: {
    bottom: 80,
    left: 30,
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
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 28,
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
  returnNotice: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  returnText: {
    fontSize: 14,
    color: '#0369A1',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  stayButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  stayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  stayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});