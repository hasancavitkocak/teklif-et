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
    name: string;
    profile_photo: string;
  };
  activity: string;
}

export const messagesAPI = {
  // Match bilgilerini getir
  getMatchInfo: async (matchId: string, userId: string) => {
    const { data: match, error } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id, proposal:proposals(activity_name)')
      .eq('id', matchId)
      .single();

    if (error) throw error;

    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    const { data: otherUser } = await supabase
      .from('profiles')
      .select('name, profile_photo')
      .eq('id', otherUserId)
      .single();

    return {
      id: match.id,
      otherUser: otherUser || { name: '', profile_photo: '' },
      activity: (match.proposal as any)?.activity_name || '',
    } as MatchInfo;
  },

  // Mesajları getir
  getMessages: async (matchId: string, userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mesajları okundu olarak işaretle
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .eq('read', false);

    return data as Message[];
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
