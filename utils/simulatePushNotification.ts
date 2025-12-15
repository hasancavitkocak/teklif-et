import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Expo Go'da push notification simülasyonu
export const simulatePushNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  try {
    // Local notification olarak gönder (Expo Go'da çalışır)
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Hemen gönder
    });
    
    console.log('✅ Simüle edilmiş bildirim gönderildi:', { title, body });
    return true;
  } catch (error) {
    console.error('❌ Simüle edilmiş bildirim hatası:', error);
    return false;
  }
};

// Test bildirimleri için özel fonksiyonlar
export const simulateTestNotifications = {
  // Mesaj bildirimi
  message: async (senderName: string, messageContent: string) => {
    return await simulatePushNotification(
      `${senderName} mesaj gönderdi`,
      messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
      { type: 'message', sender: senderName }
    );
  },

  // Eşleşme bildirimi
  match: async (matchedUserName: string) => {
    return await simulatePushNotification(
      'Yeni Eşleşme! 🎉',
      `${matchedUserName} ile eşleştiniz!`,
      { type: 'match', user: matchedUserName }
    );
  },

  // Teklif kabul bildirimi
  proposalAccepted: async (requesterName: string, activityName: string) => {
    return await simulatePushNotification(
      'Teklifiniz Kabul Edildi! ✅',
      `${requesterName} "${activityName}" teklifinizi kabul etti!`,
      { type: 'proposal', accepted: true, activity: activityName }
    );
  },

  // Teklif red bildirimi
  proposalRejected: async (requesterName: string, activityName: string) => {
    return await simulatePushNotification(
      'Teklifiniz Reddedildi',
      `${requesterName} "${activityName}" teklifinizi reddetti`,
      { type: 'proposal', accepted: false, activity: activityName }
    );
  },

  // Pazarlama bildirimi
  marketing: async (title: string, body: string) => {
    return await simulatePushNotification(
      title,
      body,
      { type: 'marketing' }
    );
  },

  // Genel test bildirimi
  general: async () => {
    return await simulatePushNotification(
      'Test Bildirimi 🧪',
      'Bu bir test bildirimidir. Sistem çalışıyor!',
      { type: 'test', timestamp: Date.now() }
    );
  },
};