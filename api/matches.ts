import { supabase } from '@/lib/supabase';

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
  deleted_by?: string;
  proposal_id?: string;
  proposal_name?: string;
  proposal?: {
    activity_name: string;
  };
  otherUser: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unreadCount?: number;
}

export const matchesAPI = {
  // Tüm eşleşmeleri getir (optimize edilmiş - tek sorguda)
  getMatches: async (userId: string) => {
    // Tüm match'leri al
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        matched_at,
        deleted_by,
        proposal_id,
        proposal_name,
        proposal:proposals(activity_name)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .is('deleted_by', null)
      .order('matched_at', { ascending: false });

    if (error) throw error;
    if (!matches || matches.length === 0) return [];

    // Tüm diğer kullanıcı ID'lerini topla
    const otherUserIds = matches.map((match: any) => 
      match.user1_id === userId ? match.user2_id : match.user1_id
    );

    // Tüm match ID'lerini topla
    const matchIds = matches.map((m: any) => m.id);

    // Tek sorguda tüm kullanıcıları al (sadece aktif olanlar)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, profile_photo, birth_date, is_active')
      .in('id', otherUserIds)
      .eq('is_active', true); // Sadece aktif kullanıcıları getir

    // Tek sorguda tüm son mesajları al
    const { data: allMessages } = await supabase
      .from('messages')
      .select('match_id, content, created_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    // Her match için son mesajı bul
    const lastMessages = new Map();
    allMessages?.forEach((msg: any) => {
      if (!lastMessages.has(msg.match_id)) {
        lastMessages.set(msg.match_id, {
          content: msg.content,
          created_at: msg.created_at,
        });
      }
    });

    // Tek sorguda tüm okunmamış mesaj sayılarını al
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('match_id')
      .in('match_id', matchIds)
      .eq('read', false)
      .neq('sender_id', userId);

    // Match ID'ye göre okunmamış sayıları hesapla
    const unreadCounts = new Map();
    unreadMessages?.forEach((msg: any) => {
      unreadCounts.set(msg.match_id, (unreadCounts.get(msg.match_id) || 0) + 1);
    });

    // Profilleri map'e çevir
    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

    // Tüm verileri birleştir (sadece aktif kullanıcıları dahil et)
    const matchesWithDetails = matches
      .map((match: any) => {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        const otherUser = profilesMap.get(otherUserId);
        
        // Eğer diğer kullanıcı aktif değilse bu match'i dahil etme
        if (!otherUser) {
          return null;
        }
        
        return {
          ...match,
          otherUser: { 
            name: otherUser.name, 
            profile_photo: otherUser.profile_photo, 
            birth_date: otherUser.birth_date 
          },
          lastMessage: lastMessages.get(match.id),
          unreadCount: unreadCounts.get(match.id) || 0,
        };
      })
      .filter(match => match !== null); // null olanları filtrele

    return matchesWithDetails as Match[];
  },

  // Match'i soft delete
  deleteMatch: async (matchId: string, userId: string) => {
    const { error } = await supabase
      .from('matches')
      .update({ deleted_by: userId })
      .eq('id', matchId);

    if (error) throw error;
  },

  // Okunmamış mesaj sayısını al (kaç kişiden)
  getUnreadCount: async (userId: string) => {
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .is('deleted_by', null);

    if (!matches || matches.length === 0) return 0;

    const matchIds = matches.map(m => m.id);

    // Tek sorguda tüm okunmamış mesajları al
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('match_id')
      .in('match_id', matchIds)
      .eq('read', false)
      .neq('sender_id', userId);

    // Kaç farklı match'te okunmamış mesaj var
    const uniqueMatches = new Set(unreadMessages?.map(m => m.match_id) || []);
    return uniqueMatches.size;
  },
};
