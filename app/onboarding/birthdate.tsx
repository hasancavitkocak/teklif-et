import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import WarningToast from '@/components/WarningToast';
import ErrorToast from '@/components/ErrorToast';

export default function BirthdateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Toast states
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const showDatePickerModal = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            triggerHaptic();
            setDate(selectedDate);
          }
        },
        maximumDate: new Date(),
        minimumDate: new Date(1940, 0, 1),
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleContinue = async () => {
    const age = calculateAge(date);
    if (age < 18) {
      setWarningMessage('Uygulamayı kullanmak için en az 18 yaşında olmalısınız.');
      setShowWarningToast(true);
      return;
    }

    triggerHaptic();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          birth_date: date.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      router.push('/onboarding/gender');
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '28%' }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View>
          <View style={styles.titleContainer}>
            <Text style={styles.stepIndicator}>Adım 2/7</Text>
            <Text style={styles.title}>Doğum tarihiniz?</Text>
            <Text style={styles.subtitle}>Yaşınız: {calculateAge(date)}</Text>
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={showDatePickerModal}
          >
            <Calendar size={20} color="#8B5CF6" />
            <Text style={styles.dateButtonText}>
              {date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Kaydediliyor...' : 'Devam Et'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Doğum Tarihiniz</Text>
              </View>

              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    triggerHaptic();
                    setDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
                textColor="#000"
                themeVariant="light"
              />

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  triggerHaptic();
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.confirmButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Warning Toast */}
      <WarningToast
        visible={showWarningToast}
        message={warningMessage}
        onHide={() => setShowWarningToast(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    marginTop: 60,
  },
  progress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  titleContainer: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
