// Push notification helper - Expo Go'da güvenli import
import { Platform } from 'react-native';

// Expo Go kontrolü
const isExpoGo = __DEV__ && !require('expo-device').isDevice;

// Conditional import - sadece gerçek cihazda import et
let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('📱 Expo Notifications yüklenemedi:', error);
  }
}

// Safe notification functions
export const safeNotificationFunctions = {
  // Local notification gönder (Expo Go'da çalışır)
  scheduleLocalNotification: async (title: string, body: string, data?: any) => {
    if (isExpoGo || !Notifications) {
      console.log(`📱 Local notification (Expo Go): ${title} - ${body}`);
      return true;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Hemen gönder
      });
      return true;
    } catch (error) {
      console.error('Local notification hatası:', error);
      return false;
    }
  },

  // İzin durumunu kontrol et
  checkPermissionStatus: async (): Promise<string> => {
    if (isExpoGo || !Notifications) {
      return 'unavailable';
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('İzin kontrolü hatası:', error);
      return 'unavailable';
    }
  },

  // İzin iste
  requestPermissions: async (): Promise<string | null> => {
    if (isExpoGo || !Notifications) {
      console.log('📱 Expo Go\'da push notification izni simüle ediliyor');
      return null;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted' ? 'granted' : null;
    } catch (error) {
      console.error('İzin isteme hatası:', error);
      return null;
    }
  },

  // Push token al
  getExpoPushToken: async (): Promise<string | null> => {
    if (isExpoGo || !Notifications) {
      console.log('📱 Expo Go\'da push token simüle ediliyor');
      return null;
    }

    try {
      const Constants = require('expo-constants');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID bulunamadı');
      }
      
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      return token;
    } catch (error) {
      console.error('Push token alma hatası:', error);
      return null;
    }
  },

  // Bildirim dinleyicisi ekle
  addNotificationListener: (callback: (notification: any) => void) => {
    if (isExpoGo || !Notifications) {
      console.log('📱 Expo Go\'da bildirim dinleyicisi simüle ediliyor');
      return { remove: () => {} };
    }

    try {
      return Notifications.addNotificationReceivedListener(callback);
    } catch (error) {
      console.error('Bildirim dinleyicisi hatası:', error);
      return { remove: () => {} };
    }
  },

  // Bildirim response dinleyicisi ekle
  addNotificationResponseListener: (callback: (response: any) => void) => {
    if (isExpoGo || !Notifications) {
      console.log('📱 Expo Go\'da bildirim response dinleyicisi simüle ediliyor');
      return { remove: () => {} };
    }

    try {
      return Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {
      console.error('Bildirim response dinleyicisi hatası:', error);
      return { remove: () => {} };
    }
  },

  // Notification handler ayarla
  setNotificationHandler: (handler: any) => {
    if (isExpoGo || !Notifications) {
      console.log('📱 Expo Go\'da notification handler simüle ediliyor');
      return;
    }

    try {
      Notifications.setNotificationHandler(handler);
    } catch (error) {
      console.error('Notification handler hatası:', error);
    }
  },

  // Android notification channel ayarla
  setNotificationChannelAsync: async (channelId: string, channel: any) => {
    if (isExpoGo || !Notifications || Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(channelId, channel);
    } catch (error) {
      console.error('Notification channel hatası:', error);
    }
  },
};

export { isExpoGo };