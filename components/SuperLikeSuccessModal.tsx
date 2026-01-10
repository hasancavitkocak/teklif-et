import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { Zap } from 'lucide-react-native';

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
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Basit fade animasyonu
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Daha hızlı otomatik kapanma
      const timer = setTimeout(() => {
        onClose();
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { opacity: fadeAnim }
          ]}
        >
          {/* Minimal Content */}
          <View style={styles.modal}>
            {/* Simple Icon */}
            <View style={styles.iconContainer}>
              <Zap size={32} color="#F59E0B" fill="#F59E0B" />
            </View>

            {/* Compact Text */}
            <Text style={styles.title}>Süper Beğeni Gönderildi!</Text>
            <Text style={styles.subtitle}>
              {userName}'e ulaştı ⚡
            </Text>
          </View>
        </Animated.View>
      </View>
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
    width: width - 80,
    maxWidth: 280,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    fontWeight: '500',
  },
});