import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'match' | 'request_accepted' | 'request_rejected' | 'new_request';
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export const notificationsAPI = {
  // Bildirimleri getir
  getNotifications: async (userId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Notification[];
  },

  // Okunmamış bildirim sayısı
  getUnreadCount: async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  // Bildirimi okundu olarak işaretle
  markAsRead: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  },

  // Bildirimi sil
  deleteNotification: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Tüm bildirimleri sil
  deleteAllNotifications: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },
};
