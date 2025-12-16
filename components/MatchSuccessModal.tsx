import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Heart, MessageCircle, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface MatchSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onMessage?: () => void;
}

export default function MatchSuccessModal({
  visible,
  onClose,
  userName,
  onMessage,
}: MatchSuccessModalProps) {
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
              colors={['#EF4444', '#F87171']}
              style={styles.iconGradient}
            >
              <Heart size={32} color="#FFF" fill="#FFF" />
            </LinearGradient>
          </View>

          {/* Content */}
          <Text style={styles.title}>🎉 Eşleşme!</Text>
          <Text style={styles.message}>
            {userName} ile eşleştiniz! Artık mesajlaşabilirsiniz.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Daha Sonra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageButton} onPress={onMessage || onClose}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.messageButtonGradient}
              >
                <MessageCircle size={18} color="#FFF" />
                <Text style={styles.messageButtonText}>Mesaj Gönder</Text>
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
    fontSize: 24,
    fontWeight: '800',
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
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  messageButton: {
    flex: 1,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});