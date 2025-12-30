import { supabase } from '@/lib/supabase';

export interface ModerationStatus {
  id: string;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_reason?: string;
  moderated_at?: string;
  is_visible: boolean;
  vision_results?: any;
}

export interface ModerationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export const moderationAPI = {
  
  // Kullanıcının fotoğraf durumlarını getir
  getUserPhotoStatuses: async (userId: string): Promise<ModerationStatus[]> => {
    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, moderation_status, moderation_reason, moderated_at, is_visible, vision_results')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Fotoğrafı manuel olarak moderation'a gönder
  requestModeration: async (photoId: string): Promise<boolean> => {
    try {
      // Edge function'ı çağır
      const { data, error } = await supabase.functions.invoke('moderate-image', {
        body: {
          photoId,
          manual: true
        }
      });

      if (error) throw error;
      return data.approved || false;
    } catch (error) {
      console.error('Manual moderation request failed:', error);
      throw error;
    }
  },

  // Kullanıcının moderation istatistiklerini getir
  getUserModerationStats: async (userId: string): Promise<ModerationStats> => {
    const { data, error } = await supabase
      .from('profile_photos')
      .select('moderation_status')
      .eq('profile_id', userId);
    
    if (error) throw error;

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: data?.length || 0
    };

    data?.forEach(photo => {
      if (photo.moderation_status in stats) {
        stats[photo.moderation_status as keyof Omit<ModerationStats, 'total'>]++;
      }
    });

    return stats;
  },

  // Reddedilen fotoğrafları getir (kullanıcı için)
  getRejectedPhotos: async (userId: string) => {
    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, photo_url, moderation_reason, moderated_at, vision_results')
      .eq('profile_id', userId)
      .eq('moderation_status', 'rejected')
      .order('moderated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Moderation loglarını getir (kullanıcı için)
  getUserModerationLogs: async (userId: string) => {
    const { data, error } = await supabase
      .from('content_moderation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  },

  // Fotoğraf yükleme öncesi kontrol
  validatePhotoUpload: (file: any): { isValid: boolean; message?: string } => {
    // Dosya boyutu kontrolü (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return { isValid: false, message: 'Fotoğraf boyutu 10MB\'dan küçük olmalıdır' };
    }
    
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Sadece JPG, PNG ve WebP formatları desteklenir' };
    }
    
    return { isValid: true };
  },

  // Fotoğraf rapor et
  reportPhoto: async (photoId: string, reporterId: string, reason: string) => {
    const { error } = await supabase
      .from('content_moderation_logs')
      .insert({
        content_type: 'profile_photo',
        content_id: photoId,
        user_id: reporterId,
        action: 'flagged',
        reason: `User report: ${reason}`
      });
    
    if (error) throw error;
    
    // Fotoğrafı tekrar inceleme kuyruğuna al
    await supabase
      .from('profile_photos')
      .update({ 
        moderation_status: 'flagged',
        is_visible: false 
      })
      .eq('id', photoId);

    // Otomatik re-moderation başlat
    await supabase.functions.invoke('moderate-image', {
      body: {
        photoId,
        reason: 'User reported content'
      }
    });
  },

  // Onaylanmış fotoğrafları getir (public)
  getApprovedPhotos: async (userId: string) => {
    const { data, error } = await supabase
      .from('approved_profile_photos')
      .select('*')
      .eq('profile_id', userId);
    
    if (error) throw error;
    return data || [];
  }
};

export default moderationAPI;