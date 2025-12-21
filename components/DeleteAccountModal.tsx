import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertTriangle, Trash2, X, Shield, Database, MessageCircle, FileText, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteAccountModal({ 
  visible, 
  onClose, 
  onConfirm, 
  loading = false 
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [showSecondStep, setShowSecondStep] = useState(false);

  const handleFirstConfirm = () => {
    setShowSecondStep(true);
  };

  // Türkçe karakterleri normalize eden fonksiyon
  const normalizeText = (text: string): string => {
    return text
      .trim()
      .replace(/İ/g, 'i')  // Büyük İ'yi küçük i'ye çevir
      .replace(/I/g, 'i')  // Büyük I'yı küçük i'ye çevir
      .toLowerCase()
      .replace(/ı/g, 'i')  // Türkçe ı'yı i'ye çevir
      .replace(/i̇/g, 'i')  // Noktalı i'yi noktasız i'ye çevir
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  };

  const handleFinalConfirm = () => {
    const normalizedText = normalizeText(confirmText);
    
    if (normalizedText === 'sil') {
      onConfirm();
    }
  };

  const handleClose = () => {
    setShowSecondStep(false);
    setConfirmText('');
    onClose();
  };

  const isConfirmValid = normalizeText(confirmText) === 'sil';

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
            {!showSecondStep ? (
              // First Step - Warning
              <>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.warningIconContainer}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.warningIconGradient}
                    >
                      <AlertTriangle size={32} color="#FFF" />
                    </LinearGradient>
                  </View>
                  
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.title}>Hesabını Sil</Text>
                <Text style={styles.subtitle}>
                  Bu işlem geri alınamaz! Hesabını silmeden önce nelerin kaybolacağını öğren.
                </Text>

                {/* Data Loss Warning */}
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>⚠️ Silinecek Veriler</Text>
                  <View style={styles.dataList}>
                    <View style={styles.dataItem}>
                      <Shield size={18} color="#EF4444" />
                      <Text style={styles.dataText}>Profil bilgilerin ve fotoğrafların</Text>
                    </View>
                    <View style={styles.dataItem}>
                      <MessageCircle size={18} color="#EF4444" />
                      <Text style={styles.dataText}>Tüm mesajların ve sohbetlerin</Text>
                    </View>
                    <View style={styles.dataItem}>
                      <FileText size={18} color="#EF4444" />
                      <Text style={styles.dataText}>Oluşturduğun teklifler</Text>
                    </View>
                    <View style={styles.dataItem}>
                      <Users size={18} color="#EF4444" />
                      <Text style={styles.dataText}>Eşleşmelerin ve bağlantıların</Text>
                    </View>
                    <View style={styles.dataItem}>
                      <Database size={18} color="#EF4444" />
                      <Text style={styles.dataText}>Tüm uygulama geçmişin</Text>
                    </View>
                  </View>
                </View>

                {/* Alternative Suggestion */}
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionTitle}>💡 Alternatif Öneri</Text>
                  <Text style={styles.suggestionText}>
                    Hesabını silmek yerine geçici olarak dondurmayı düşündün mü? 
                    Böylece verilerini kaybetmeden bir ara verebilirsin.
                  </Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.continueButton} onPress={handleFirstConfirm}>
                    <Text style={styles.continueButtonText}>Yine de Devam Et</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // Second Step - Final Confirmation
              <>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.finalWarningIconContainer}>
                    <LinearGradient
                      colors={['#DC2626', '#B91C1C']}
                      style={styles.finalWarningIconGradient}
                    >
                      <Trash2 size={32} color="#FFF" />
                    </LinearGradient>
                  </View>
                  
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Final Warning */}
                <Text style={styles.finalTitle}>Son Uyarı</Text>
                <Text style={styles.finalSubtitle}>
                  Hesabını kalıcı olarak silmek üzeresin. Bu işlem geri alınamaz!
                </Text>

                {/* Confirmation Input */}
                <View style={styles.confirmationSection}>
                  <Text style={styles.confirmationLabel}>
                    Devam etmek için aşağıya <Text style={styles.confirmationKeyword}>"SİL"</Text> yaz:
                  </Text>
                  <TextInput
                    style={[
                      styles.confirmationInput,
                      isConfirmValid && styles.confirmationInputValid,
                    ]}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder="SİL yazın"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Final Buttons */}
                <View style={styles.buttons}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setShowSecondStep(false)}>
                    <Text style={styles.backButtonText}>Geri</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.deleteButton, 
                      (!isConfirmValid || loading) && styles.deleteButtonDisabled
                    ]} 
                    onPress={handleFinalConfirm}
                    disabled={!isConfirmValid || loading}
                  >
                    <LinearGradient
                      colors={
                        !isConfirmValid || loading 
                          ? ['#9CA3AF', '#6B7280'] 
                          : ['#DC2626', '#B91C1C']
                      }
                      style={styles.deleteButtonGradient}
                    >
                      {loading ? (
                        <Text style={styles.deleteButtonText}>Siliniyor...</Text>
                      ) : (
                        <>
                          <Trash2 size={18} color="#FFF" />
                          <Text style={styles.deleteButtonText}>Kalıcı Olarak Sil</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  warningIconContainer: {
    marginTop: 4,
  },
  warningIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finalWarningIconContainer: {
    marginTop: 4,
  },
  finalWarningIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
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
  finalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 12,
  },
  dataList: {
    gap: 8,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dataText: {
    fontSize: 14,
    color: '#7F1D1D',
    flex: 1,
  },
  suggestionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  confirmationSection: {
    marginBottom: 24,
  },
  confirmationLabel: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationKeyword: {
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmationInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmationInputValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteButton: {
    flex: 1,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});