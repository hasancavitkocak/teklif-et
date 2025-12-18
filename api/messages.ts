import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface MatchInfo {
  id: string;
  otherUser: {
    id: string;
    name: string;
    profile_photo: string;
  };
  activity: string;
}

export const messagesAPI = {
  // Conversation'ı başlat - match info ve mesajları birlikte getir (TEK ÇAĞRI)
  initializeConversation: async (matchId: string, userId: string) => {
    // Paralel olarak her şeyi yükle
    const [matchResult, messagesResult] = await Promise.all([
      // Match bilgisi
      supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          proposal_name,
          proposal:proposals(activity_name),
          user1:profiles!user1_id(id, name, profile_photo),
          user2:profiles!user2_id(id, name, profile_photo)
        `)
        .eq('id', matchId)
        .single(),
      // Mesajlar
      supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true }),
    ]);

    if (matchResult.error) throw matchResult.error;
    if (messagesResult.error) throw messagesResult.error;

    // Okundu işaretleme - arka planda (await etmiyoruz)
    supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .eq('read', false)
      .then(() => console.log('Messages marked as read'));

    // Match info'yu hazırla
    const match = matchResult.data;
    const isUser1 = match.user1_id === userId;
    const otherUser = isUser1 ? (match as any).user2 : (match as any).user1;

    return {
      matchInfo: {
        id: match.id,
        otherUser: otherUser || { id: '', name: '', profile_photo: '' },
        activity: (match as any).proposal_name || (match.proposal as any)?.activity_name || 'Teklif',
      } as MatchInfo,
      messages: messagesResult.data as Message[],
    };
  },

  // Match bilgilerini getir (eski - geriye dönük uyumluluk için)
  getMatchInfo: async (matchId: string, userId: string) => {
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        proposal_name,
        proposal:proposals(activity_name),
        user1:profiles!user1_id(name, profile_photo),
        user2:profiles!user2_id(name, profile_photo)
      `)
      .eq('id', matchId)
      .single();

    if (error) throw error;

    const isUser1 = match.user1_id === userId;
    const otherUser = isUser1 ? (match as any).user2 : (match as any).user1;

    return {
      id: match.id,
      otherUser: otherUser || { name: '', profile_photo: '' },
      activity: (match as any).proposal_name || (match.proposal as any)?.activity_name || 'Teklif',
    } as MatchInfo;
  },

  // Mesajları getir (eski - geriye dönük uyumluluk için)
  getMessages: async (matchId: string, userId: string) => {
    const [messagesResult] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true }),
      supabase
        .from('messages')
        .update({ read: true })
        .eq('match_id', matchId)
        .neq('sender_id', userId)
        .eq('read', false),
    ]);

    if (messagesResult.error) throw messagesResult.error;

    return messagesResult.data as Message[];
  },

  // Mesaj gönder
  sendMessage: async (matchId: string, senderId: string, content: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: content.trim(),
      });

    if (error) throw error;

    // Push notification gönder
    try {
      // Match bilgisini al
      const { data: match } = await supabase
        .from('matches')
        .select(`
          user1_id,
          user2_id,
          user1:profiles!user1_id(name),
          user2:profiles!user2_id(name)
        `)
        .eq('id', matchId)
        .single();

      if (match) {
        // Alıcıyı belirle
        const recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id;
        const senderName = match.user1_id === senderId 
          ? (match as any).user1?.name || 'Bilinmeyen'
          : (match as any).user2?.name || 'Bilinmeyen';

        // Push notification gönder (dinamik import)
        const { notificationsAPI } = await import('./notifications');
        await notificationsAPI.sendMessageNotification(recipientId, senderName, content, matchId);
      }
    } catch (error) {
      console.error('Mesaj bildirimi gönderme hatası:', error);
    }
  },

  // Match'i soft delete
  deleteMatch: async (matchId: string, userId: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ deleted_by: userId })
      .eq('id', matchId);

    if (error) throw error;
  },
};
