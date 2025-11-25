import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Crown, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SimplePremiumAlertProps {
  visible: boolean;
  onClose: () => void;
}

export default function SimplePremiumAlert({ visible, onClose }: SimplePremiumAlertProps) {
  const router = useRouter();

  const handlePremium = () => {
    onClose();
    router.push('/(tabs)/premium');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.alertContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Crown size={48} color="#F59E0B" fill="#F59E0B" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Premium Özellik</Text>

          {/* Message */}
          <Text style={styles.message}>
            Gelişmiş filtreler ile konum, yaş aralığı ve cinsiyet seçeneklerini kullanabilmek için Premium üye olmalısınız.
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.premiumButton}
              onPress={handlePremium}
            >
              <Crown size={18} color="#FFF" fill="#FFF" />
              <Text style={styles.premiumText}>Premium Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10002,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
