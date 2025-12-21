import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle, Sparkles, Crown, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PackagePurchaseSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  packageName: string;
  packageCategory: string;
  creditsAmount?: number;
}

export default function PackagePurchaseSuccessModal({ 
  visible, 
  onClose, 
  packageName,
  packageCategory,
  creditsAmount
}: PackagePurchaseSuccessModalProps) {

  const getIcon = () => {
    switch (packageCategory) {
      case 'super_like':
        return <Sparkles size={32} color="#FFF" fill="#FFF" />;
      case 'boost':
        return <Crown size={32} color="#FFF" />;
      default:
        return <CheckCircle size={32} color="#FFF" />;
    }
  };

  const getGradientColors = (): [string, string] => {
    switch (packageCategory) {
      case 'super_like':
        return ['#F59E0B', '#D97706'];
      case 'boost':
        return ['#8B5CF6', '#7C3AED'];
      default:
        return ['#10B981', '#059669'];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={25} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={getGradientColors()}
                style={styles.iconContainer}
              >
                {getIcon()}
              </LinearGradient>
              
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>🎉 Başarılı!</Text>
              <Text style={styles.subtitle}>
                <Text style={styles.packageName}>{packageName}</Text> başarıyla satın alındı!
              </Text>
              
              {creditsAmount && (
                <View style={styles.creditsInfo}>
                  <Text style={styles.creditsText}>
                    <Text style={styles.creditsAmount}>+{creditsAmount}</Text> kredi hesabınıza eklendi
                  </Text>
                </View>
              )}

              <Text style={styles.description}>
                Yeni özelliklerinizi hemen kullanmaya başlayabilirsiniz.
              </Text>
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <LinearGradient
                colors={getGradientColors()}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Harika!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: width - 32,
    maxWidth: 380,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  packageName: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  creditsInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  creditsText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
  },
  creditsAmount: {
    fontWeight: '700',
    color: '#3B82F6',
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});