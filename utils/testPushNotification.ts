import { notificationsAPI } from '@/api/notifications';
import { simulateTestNotifications } from './simulatePushNotification';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Test push notification gönderme fonksiyonu
export const testPushNotification = async (userId: string) => {
  try {
    console.log('🧪 Test push notification gönderiliyor...');
    
    // Development modda simülasyon kullan
    if (__DEV__) {
      console.log('📱 Development mode tespit edildi, simülasyon kullanılıyor...');
      const success = await simulateTestNotifications.general();
      return success;
    } else {
      // Production'da gerçek push notification gönder
      await notificationsAPI.sendPushNotification(
        userId,
        'Test Bildirimi 🧪',
        'Bu bir test bildirimidir. Push notification sistemi çalışıyor!',
        { type: 'test', timestamp: Date.now() }
      );
    }
    
    console.log('✅ Test push notification gönderildi');
    return true;
  } catch (error) {
    console.error('❌ Test push notification hatası:', error);
    return false;
  }
};

// Tüm bildirim türlerini test etme
export const testAllNotificationTypes = async (userId: string) => {
  try {
    console.log('🧪 Tüm bildirim türleri test ediliyor...');
    
    // Development modda simülasyon kullan
    if (__DEV__) {
      console.log('📱 Development mode tespit edildi, simülasyon kullanılıyor...');
      
      // 2 saniye arayla bildirimleri gönder
      await simulateTestNotifications.message('Test Kullanıcı', 'Bu bir test mesajıdır');
      
      setTimeout(async () => {
        await simulateTestNotifications.match('Test Eşleşme');
      }, 2000);
      
      setTimeout(async () => {
        await simulateTestNotifications.proposalAccepted('Test Kullanıcı', 'Test Aktivitesi');
      }, 4000);
      
      setTimeout(async () => {
        await simulateTestNotifications.marketing('Premium Özellikler! 🎉', 'Sınırsız teklif gönderme imkanı için premium üye olun!');
      }, 6000);
      
    } else {
      // Gerçek push notification'lar
      // Mesaj bildirimi
      await notificationsAPI.sendMessageNotification(
        userId,
        'Test Kullanıcı',
        'Bu bir test mesajıdır',
        'test-match-id'
      );
      
      // Eşleşme bildirimi
      await notificationsAPI.sendMatchNotification(
        userId,
        'Test Eşleşme'
      );
      
      // Teklif kabul bildirimi
      await notificationsAPI.sendProposalNotification(
        userId,
        'Test Kullanıcı',
        true,
        'Test Aktivitesi'
      );
      
      // Pazarlama bildirimi
      await notificationsAPI.sendMarketingNotification(
        userId,
        'Premium Özellikler! 🎉',
        'Sınırsız teklif gönderme imkanı için premium üye olun!'
      );
    }
    
    console.log('✅ Tüm test bildirimleri gönderildi');
    return true;
  } catch (error) {
    console.error('❌ Test bildirimleri hatası:', error);
    return false;
  }
};