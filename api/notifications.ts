import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  notification_messages: boolean;
  notification_matches: boolean;
  notification_proposals: boolean;
  notification_marketing: boolean;
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

  // Push notification gönderme (gelecekte Expo Notifications ile entegre edilecek)
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
          console.log(`Bildirim gönderilmedi: ${notificationType} kapalı (User: ${userId})`);
          return;
        }
      }

      // TODO: Expo Notifications ile push notification gönder
      console.log('Push notification gönderilecek:', {
        userId,
        title,
        body,
        data,
        type: notificationType
      });

      // Şimdilik sadece console'a log at
      // Gerçek implementasyon:
      // const { data: profile } = await supabase
      //   .from('profiles')
      //   .select('push_token')
      //   .eq('id', userId)
      //   .single();
      // 
      // if (profile?.push_token) {
      //   await Notifications.sendPushNotificationAsync({
      //     to: profile.push_token,
      //     title,
      //     body,
      //     data
      //   });
      // }

    } catch (error) {
      console.error('Push notification gönderme hatası:', error);
    }
  },

  // Yeni mesaj bildirimi
  sendMessageNotification: async (recipientId: string, senderName: string, messageContent: string) => {
    await notificationsAPI.sendPushNotification(
      recipientId,
      `${senderName} mesaj gönderdi`,
      messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent,
      { type: 'message', senderId: recipientId },
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
};