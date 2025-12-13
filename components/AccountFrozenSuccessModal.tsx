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
import { CheckCircle, Snowflake, LogIn } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface AccountFrozenSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AccountFrozenSuccessModal({ 
  visible, 
  onClose 
}: AccountFrozenSuccessModalProps) {
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

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
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
          <View style={styles.modal}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.successIconGradient}
              >
                <CheckCircle size={48} color="#FFF" fill="#FFF" />
              </LinearGradient>
              
              {/* Floating Snowflake */}
              <View style={styles.floatingIcon}>
                <Snowflake size={24} color="#60A5FA" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Hesabın Donduruldu</Text>
            <Text style={styles.subtitle}>
              Profilin artık gizli durumda ve tüm aktivitelerin duraklatıldı
            </Text>

            {/* Status Cards */}
            <View style={styles.statusCards}>
              <View style={styles.statusCard}>
                <View style={styles.statusIcon}>
                  <Snowflake size={20} color="#60A5FA" />
                </View>
                <Text style={styles.statusText}>Profil Gizlendi</Text>
              </View>

              <View style={styles.statusCard}>
                <View style={styles.statusIcon}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <Text style={styles.statusText}>Veriler Korundu</Text>
              </View>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Tekrar Aktif Olmak İçin:</Text>
              <View style={styles.infoSteps}>
                <View style={styles.infoStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Uygulamaya giriş yap</Text>
                </View>
                <View style={styles.infoStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Hesabın otomatik aktif olacak</Text>
                </View>
              </View>
            </View>

            {/* Reassurance Box */}
            <View style={styles.reassuranceBox}>
              <Text style={styles.reassuranceText}>
                🔒 Hiçbir verin silinmedi. Teklifler, mesajlar ve eşleşmeler 
                güvende saklanıyor.
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.buttonGradient}
              >
                <LogIn size={20} color="#FFF" />
                <Text style={styles.buttonText}>Giriş Ekranına Git</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    width: width - 32,
    maxWidth: 400,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  successIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  statusCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  infoSection: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoSteps: {
    gap: 8,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  stepText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  reassuranceBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignSelf: 'stretch',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  reassuranceText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});