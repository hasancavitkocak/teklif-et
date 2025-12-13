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
import { AlertTriangle, X, Crown, Calendar, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PremiumCancelModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  expiryDate?: string;
  loading?: boolean;
}

export default function PremiumCancelModal({ 
  visible, 
  onClose,
  onConfirm,
  expiryDate,
  loading = false
}: PremiumCancelModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const shakeAnim = new Animated.Value(0);

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

      // Subtle shake animation for warning
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      shakeAnim.setValue(0);
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

            {/* Warning Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  transform: [{
                    translateX: shakeAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-2, 2],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.warningIconContainer}>
                <AlertTriangle size={48} color="#EF4444" />
              </View>
            </Animated.View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Aboneliği İptal Et</Text>
              <Text style={styles.subtitle}>
                Premium aboneliğinizi iptal etmek istediğinizden emin misiniz?
              </Text>

              {/* Info Cards */}
              <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                  <Calendar size={20} color="#8B5CF6" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Premium Hakları</Text>
                    <Text style={styles.infoText}>
                      {expiryDate ? `${formatDate(expiryDate)} tarihine kadar aktif kalacak` : 'Mevcut dönem sonuna kadar devam edecek'}
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

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <View style={styles.warningHeader}>
                  <Crown size={16} color="#EF4444" />
                  <Text style={styles.warningTitle}>Kaybedecekleriniz:</Text>
                </View>
                <View style={styles.warningList}>
                  <Text style={styles.warningItem}>• Sınırsız teklif gönderme</Text>
                  <Text style={styles.warningItem}>• Gelişmiş filtreleme</Text>
                  <Text style={styles.warningItem}>• Öncelikli görünüm</Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.keepButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.keepGradient}
                  >
                    <Crown size={18} color="#FFF" />
                    <Text style={styles.keepButtonText}>Premium'da Kal</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>
                    {loading ? 'İptal Ediliyor...' : 'İptal Et'}
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
  warningIconContainer: {
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
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  warningList: {
    gap: 4,
  },
  warningItem: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  keepButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  keepGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  keepButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});