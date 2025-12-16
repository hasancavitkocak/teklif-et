import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onGrantPermission: () => void;
}

export default function LocationPermissionModal({
  visible,
  onClose,
  onGrantPermission,
}: LocationPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.iconGradient}
            >
              <MapPin size={32} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Content */}
          <Text style={styles.title}>Konum İzni Gerekli</Text>
          <Text style={styles.message}>
            Keşfet sayfasını görüntüleyebilmek için konum izni gereklidir. Size yakın teklifleri gösterebilmemiz için konumunuza ihtiyacımız var.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.grantButton} onPress={onGrantPermission}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.grantButtonGradient}
              >
                <Text style={styles.grantButtonText}>İzin Ver</Text>
              </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: width - 40,
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  grantButton: {
    flex: 1,
  },
  grantButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  grantButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});