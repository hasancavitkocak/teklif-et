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
import { UserCheck, MessageCircle, X, Sparkles, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface InvitationAcceptedModalProps {
  visible: boolean;
  onClose: () => void;
  onMessage: () => void;
  inviterName?: string;
  proposalName?: string;
}

export default function InvitationAcceptedModal({ 
  visible, 
  onClose, 
  onMessage,
  inviterName = "Kullanıcı",
  proposalName = "Teklif"
}: InvitationAcceptedModalProps) {

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
              <View style={styles.acceptIconContainer}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.acceptIconGradient}
                >
                  <UserCheck size={32} color="#FFF" />
                </LinearGradient>
              </View>
              
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Celebration Animation Area */}
            <View style={styles.celebrationContainer}>
              <View style={styles.sparkleContainer}>
                <Sparkles size={24} color="#F59E0B" />
                <Sparkles size={20} color="#10B981" />
                <Sparkles size={18} color="#8B5CF6" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>🎉 Davet Kabul Edildi!</Text>
            <Text style={styles.subtitle}>
              {inviterName} kullanıcısının "{proposalName}" davetini kabul ettiniz. {inviterName} kullanıcısıyla eşleştiniz!
            </Text>

            {/* Success Info */}
            <View style={styles.successInfoBox}>
              <View style={styles.successInfoHeader}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.successInfoTitle}>Eşleşme Tamamlandı</Text>
              </View>
              <Text style={styles.successInfoText}>
                Davet kabul edildi ve artık teklif sahibiyle mesajlaşabilirsiniz.
              </Text>
            </View>

            {/* Tips Box */}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Sırada Ne Var?</Text>
              <Text style={styles.tipsText}>
                • Teklif sahibi ile mesajlaşmaya başlayabilirsiniz{'\n'}
                • Etkinlik detaylarını konuşabilirsiniz{'\n'}
                • Buluşma planlarınızı yapabilirsiniz
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterButtonText}>Sonra Mesajlaş</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.messageButtonGradient}
                >
                  <MessageCircle size={18} color="#FFF" />
                  <Text style={styles.messageButtonText}>Mesaj Gönder</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    maxWidth: 420,
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
  acceptIconContainer: {
    marginTop: 4,
  },
  acceptIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
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
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sparkleContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
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
    marginBottom: 24,
    lineHeight: 24,
  },
  successInfoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  successInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  successInfoText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
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
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});