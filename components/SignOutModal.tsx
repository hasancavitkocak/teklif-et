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
import { LogOut } from 'lucide-react-native';

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
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
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
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}} // Modal içeriğine tıklamayı engelle
            style={styles.modal}
          >
            {/* Logout Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.logoutIconContainer}>
                <LogOut size={32} color="#EF4444" />
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Çıkış Yap</Text>
              <Text style={styles.subtitle}>
                Çıkış yapmak istediğinize emin misiniz?
              </Text>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
                  onPress={() => {
                    console.log('🔘 İptal butonuna basıldı');
                    onClose();
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
                  onPress={() => {
                    console.log('🔘 SignOutModal onConfirm çağrılıyor...');
                    onConfirm();
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signOutButtonText}>
                    {loading ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: width - 64,
    maxWidth: 320,
    position: 'relative',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  signOutButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});