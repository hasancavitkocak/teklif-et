import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  notification_messages: boolean;
  notification_matches: boolean;
  notification_proposals: boolean;
  notification_marketing: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export const notificationsAPI = {
  // Kullanıcının bildirim tercihlerini getir
  getPreferences: async (userId: string): Promise<NotificationPreferences> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_messages, notification_matches, notification_proposals, notification_marketing')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      notification_messages: data.notification_messages ?? true,
      notification_matches: data.notification_matches ?? true,
      notification_proposals: data.notification_proposals ?? true,
      notification_marketing: data.notification_marketing ?? false,
    };
  },

  // Bildirim tercihlerini güncelle
  updatePreferences: async (userId: string, preferences: Partial<NotificationPreferences>) => {
    const { error } = await supabase
      .from('profiles')
      .update(preferences)
      .eq('id', userId);

    if (error) throw error;
  },

  // Belirli bir bildirim türünün açık olup olmadığını kontrol et
  isNotificationEnabled: async (userId: string, type: keyof NotificationPreferences): Promise<boolean> => {
    const preferences = await notificationsAPI.getPreferences(userId);
    return preferences[type];
  },

  // Push notification gönderme
  sendPushNotification: async (
    userId: string, 
    title: string, 
    body: string, 
    data?: any,
    notificationType?: keyof NotificationPreferences
  ) => {
    try {
      // Önce kullanıcının bu bildirim türünü açık olup olmadığını kontrol et
      if (notificationType) {
        const isEnabled = await notificationsAPI.isNotificationEnabled(userId, notificationType);
        if (!isEnabled) {
          console.log(`📱 Bildirim gönderilmedi: ${notificationType} kapalı (User: ${userId})`);
          return;
        }
      }

      // Kullanıcının push token'ını al
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (!profile?.push_token) {
        console.log(`📱 Push token bulunamadı (User: ${userId}) - Kullanıcı henüz bildirim izni vermemiş`);
        return;
      }

      // Push token formatını kontrol et (Expo token mu?)
      if (!profile.push_token.startsWith('ExponentPushToken[')) {
        console.log(`📱 Geçersiz push token formatı (User: ${userId})`);
        return;
      }

      // Development modda da gerçek push notification gönder (development build'de)
      // Sadece Expo Go'da devre dışı bırak
      const isExpoGo = __DEV__ && !require('expo-device').isDevice;
      
      if (isExpoGo) {
        console.log(`📱 Push notification (Expo Go'da devre dışı): ${title} - ${body}`);
        return;
      }
      
      console.log(`📤 Push notification gönderiliyor: ${title} - ${body} (Token: ${profile.push_token.substring(0, 30)}...)`);
      
      // Development build'de gerçek push notification gönder

      // Production'da gerçek push notification gönder
      const message = {
        to: profile.push_token,
        sound: 'default',
        title,
        body,
        data: data || {},
      };

      console.log('📤 Push notification gönderiliyor:', { userId, title, token: profile.push_token.substring(0, 30) + '...' });

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.data && result.data[0]) {
        if (result.data[0].status === 'error') {
          console.error('❌ Push notification hatası:', result.data[0].message);
        } else {
          console.log('✅ Push notification gönderildi:', { userId, title, status: result.data[0].status });
        }
      } else {
        console.log('✅ Push notification gönderildi:', { userId, title });
      }

    } catch (error) {
      // Network hatalarını daha sessiz handle et
      if (error instanceof Error && error.message.includes('Network request failed')) {
        console.log(`📱 Push notification gönderilemedi (network hatası) - User: ${userId}`);
      } else {
        console.error('❌ Push notification gönderme hatası:', error);
      }
    }
  },

  // Yeni mesaj bildirimi
  sendMessageNotification: async (recipientId: string, senderName: string, messageContent: string, matchId?: string) => {
    await notificationsAPI.sendPushNotification(
      recipientId,
      `${senderName} mesaj gönderdi`,
      messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
      { type: 'message', matchId },
      'notification_messages'
    );
  },

  // Yeni eşleşme bildirimi
  sendMatchNotification: async (userId: string, matchedUserName: string) => {
    await notificationsAPI.sendPushNotification(
      userId,
      'Yeni Eşleşme! 🎉',
      `${matchedUserName} ile eşleştiniz!`,
      { type: 'match' },
      'notification_matches'
    );
  },

  // Teklif kabul/red bildirimi
  sendProposalNotification: async (userId: string, requesterName: string, isAccepted: boolean, activityName: string) => {
    const title = isAccepted ? 'Teklifiniz Kabul Edildi! ✅' : 'Teklifiniz Reddedildi';
    const body = isAccepted 
      ? `${requesterName} "${activityName}" teklifinizi kabul etti!`
      : `${requesterName} "${activityName}" teklifinizi reddetti`;

    await notificationsAPI.sendPushNotification(
      userId,
      title,
      body,
      { type: 'proposal', isAccepted, activityName },
      'notification_proposals'
    );
  },

  // Pazarlama bildirimi
  sendMarketingNotification: async (userId: string, title: string, body: string, data?: any) => {
    await notificationsAPI.sendPushNotification(
      userId,
      title,
      body,
      { type: 'marketing', ...data },
      'notification_marketing'
    );
  },

  // Yeni teklif başvurusu bildirimi
  sendNewProposalRequestNotification: async (creatorId: string, requesterName: string, activityName: string, isSuperLike: boolean = false) => {
    const title = isSuperLike ? 'Yeni Super Like! ⭐' : 'Yeni Teklif Başvurusu! 🎯';
    const body = isSuperLike 
      ? `${requesterName} "${activityName}" teklifinize super like attı!`
      : `${requesterName} "${activityName}" teklifinize başvurdu!`;

    await notificationsAPI.sendPushNotification(
      creatorId,
      title,
      body,
      { type: 'proposal_request', requesterName, activityName, isSuperLike },
      'notification_proposals'
    );
  },

  // Bildirimleri getir (şimdilik boş array döndür - gelecekte database'den gelecek)
  getNotifications: async (userId: string): Promise<Notification[]> => {
    // TODO: Gerçek bildirimler database'den gelecek
    // Şimdilik boş array döndürüyoruz
    return [];
  },

  // Okunmamış bildirim sayısını getir
  getUnreadCount: async (userId: string): Promise<number> => {
    // TODO: Gerçek sayı database'den gelecek
    // Şimdilik 0 döndürüyoruz
    return 0;
  },

  // Bildirimi okundu olarak işaretle
  markAsRead: async (notificationId: string): Promise<void> => {
    // TODO: Database'de güncelleme yapılacak
    console.log('Bildirim okundu olarak işaretlendi:', notificationId);
  },

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead: async (userId: string): Promise<void> => {
    // TODO: Database'de güncelleme yapılacak
    console.log('Tüm bildirimler okundu olarak işaretlendi:', userId);
  },

  // Bildirimi sil
  deleteNotification: async (notificationId: string): Promise<void> => {
    // TODO: Database'den silme yapılacak
    console.log('Bildirim silindi:', notificationId);
  },
};