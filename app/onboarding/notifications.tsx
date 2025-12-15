import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, BellOff, MessageCircle, Heart, Gift, Crown } from 'lucide-react-native';
import { usePushNotifications } from '@/contexts/PushNotificationContext';
import * as Notifications from 'expo-notifications';

export default function NotificationsOnboardingScreen() {
  const router = useRouter();
  const { registerForPushNotifications } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    
    try {
      const token = await registerForPushNotifications();
      
      if (token) {
        Alert.alert(
          'Harika! 🎉',
          'Bildirimler başarıyla etkinleştirildi. Artık önemli güncellemeleri kaçırmayacaksın!',
          [
            {
              text: 'Devam Et',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        // İzin reddedildi
        Alert.alert(
          'Bildirim İzni',
          'Bildirim izni reddedildi. İstersen daha sonra ayarlardan etkinleştirebilirsin.',
          [
            {
              text: 'Ayarlara Git',
              onPress: () => {
                // iOS ve Android için ayarları açma
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
            {
              text: 'Şimdilik Geç',
              onPress: () => router.replace('/(tabs)'),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error) {
      console.error('Bildirim izni hatası:', error);
      Alert.alert(
        'Hata',
        'Bildirim ayarları yapılırken bir hata oluştu. Daha sonra tekrar deneyebilirsin.',
        [
          {
            text: 'Tamam',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Bildirimleri Atla',
      'Emin misin? Bildirimler sayesinde yeni eşleşmeler, mesajlar ve önemli güncellemeleri anında öğrenebilirsin.',
      [
        {
          text: 'Geri Dön',
          style: 'cancel',
        },
        {
          text: 'Evet, Atla',
          onPress: () => router.replace('/(tabs)'),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Bell size={48} color="#8B5CF6" />
          </View>
          <Text style={styles.title}>Bildirimleri Etkinleştir</Text>
          <Text style={styles.subtitle}>
            Önemli anları kaçırma! Yeni eşleşmeler, mesajlar ve özel teklifler için bildirim al.
          </Text>
        </View>

        {/* Bildirim Türleri */}
        <View style={styles.notificationTypes}>
          <View style={styles.notificationType}>
            <View style={styles.notificationIcon}>
              <MessageCircle size={24} color="#10B981" />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Yeni Mesajlar</Text>
              <Text style={styles.notificationDescription}>
                Birisi sana mesaj gönderdiğinde hemen haberdar ol
              </Text>
            </View>
          </View>

          <View style={styles.notificationType}>
            <View style={styles.notificationIcon}>
              <Heart size={24} color="#EF4444" />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Yeni Eşleşmeler</Text>
              <Text style={styles.notificationDescription}>
                Yeni bir eşleşmen olduğunda anında öğren
              </Text>
            </View>
          </View>

          <View style={styles.notificationType}>
            <View style={styles.notificationIcon}>
              <Gift size={24} color="#F59E0B" />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Teklif Güncellemeleri</Text>
              <Text style={styles.notificationDescription}>
                Tekliflerinin kabul/red durumunu öğren
              </Text>
            </View>
          </View>

          <View style={styles.notificationType}>
            <View style={styles.notificationIcon}>
              <Crown size={24} color="#8B5CF6" />
            </View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Özel Teklifler</Text>
              <Text style={styles.notificationDescription}>
                Premium özellikler ve kampanyalardan haberdar ol
              </Text>
            </View>
          </View>
        </View>

        {/* Güvenlik Notu */}
        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 Bildirim ayarlarını istediğin zaman profil sayfasından değiştirebilirsin.
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.enableButton, isLoading && styles.disabledButton]}
          onPress={handleEnableNotifications}
          disabled={isLoading}
        >
          <Bell size={20} color="#FFFFFF" />
          <Text style={styles.enableButtonText}>
            {isLoading ? 'Etkinleştiriliyor...' : 'Bildirimleri Etkinleştir'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Şimdilik Geç</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  notificationTypes: {
    gap: 20,
    marginBottom: 32,
  },
  notificationType: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationInfo: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  securityNote: {
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  securityText: {
    fontSize: 14,
    color: '#0369A1',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    gap: 12,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});