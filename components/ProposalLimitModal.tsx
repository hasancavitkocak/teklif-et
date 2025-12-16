import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Crown, X, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ProposalLimitModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function ProposalLimitModal({
  visible,
  onClose,
  onUpgrade,
}: ProposalLimitModalProps) {
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
              colors={['#F59E0B', '#FBBF24']}
              style={styles.iconGradient}
            >
              <Crown size={32} color="#FFF" fill="#FFF" />
            </LinearGradient>
          </View>

          {/* Content */}
          <Text style={styles.title}>Günlük Teklif Hakkınız Bitti</Text>
          <Text style={styles.message}>
            Teklif gönderebilmek için premium ol ve sınırsız teklif hakkına sahip ol!
          </Text>

          {/* Features */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Zap size={16} color="#F59E0B" />
              <Text style={styles.featureText}>Sınırsız teklif gönderme</Text>
            </View>
            <View style={styles.featureItem}>
              <Zap size={16} color="#F59E0B" />
              <Text style={styles.featureText}>Gelişmiş filtreler</Text>
            </View>
            <View style={styles.featureItem}>
              <Zap size={16} color="#F59E0B" />
              <Text style={styles.featureText}>Süper beğeni</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Daha Sonra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24']}
                style={styles.upgradeButtonGradient}
              >
                <Crown size={18} color="#FFF" fill="#FFF" />
                <Text style={styles.upgradeButtonText}>Premium Ol</Text>
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
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
  upgradeButton: {
    flex: 1,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});