import { supabase } from '@/lib/supabase';

export interface Proposal {
  id: string;
  activity_name: string;
  description: string;
  location_name: string;
  participant_count: number;
  is_group: boolean;
  city: string;
  status: string;
  created_at: string;
  interest: {
    name: string;
  };
  requests_count?: number;
}

export interface ProposalRequest {
  id: string;
  status: string;
  is_super_like: boolean;
  created_at: string;
  requester_id: string;
  proposal: {
    id: string;
    activity_name: string;
    city: string;
    creator: {
      name: string;
      profile_photo: string;
      birth_date: string;
    };
  };
  requester: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
}

export const proposalsAPI = {
  // Kullanıcının kendi tekliflerini getir
  getMyProposals: async (userId: string) => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        id,
        activity_name,
        description,
        location_name,
        participant_count,
        is_group,
        city,
        status,
        created_at,
        interest:interests(name)
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Her teklif için başvuru sayısını al
    const proposalsWithCounts = await Promise.all(
      (data || []).map(async (proposal: any) => {
        const { count } = await supabase
          .from('proposal_requests')
          .select('*', { count: 'exact', head: true })
          .eq('proposal_id', proposal.id)
          .eq('status', 'pending');
        return { ...proposal, requests_count: count || 0 };
      })
    );

    return proposalsWithCounts as Proposal[];
  },

  // Gelen başvuruları getir (optimize edilmiş - tek sorgu)
  // Pending ve accepted olanları göster, rejected/auto_rejected olanları gösterme
  getReceivedRequests: async (userId: string) => {
    const { data, error } = await supabase
      .from('proposal_requests')
      .select(`
        id,
        status,
        is_super_like,
        created_at,
        requester_id,
        proposal:proposals!proposal_id!inner(
          id,
          activity_name,
          city,
          creator_id,
          creator:profiles!creator_id(name, profile_photo, birth_date)
        ),
        requester:profiles!requester_id(name, profile_photo, birth_date)
      `)
      .eq('proposals.creator_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any as ProposalRequest[];
  },

  // Gönderilen başvuruları getir
  // Tüm durumları göster ama auto_rejected olanları filtrele
  getSentRequests: async (userId: string) => {
    const { data, error } = await supabase
      .from('proposal_requests')
      .select(`
        id,
        status,
        is_super_like,
        created_at,
        proposal:proposals!proposal_id(
          id,
          activity_name,
          city,
          creator:profiles!creator_id(name, profile_photo, birth_date)
        ),
        requester:profiles!requester_id(name, profile_photo, birth_date)
      `)
      .eq('requester_id', userId)
      .neq('status', 'auto_rejected')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any as ProposalRequest[];
  },

  // Teklif oluştur
  createProposal: async (data: {
    creator_id: string;
    activity_name: string;
    description?: string;
    location_name?: string;
    participant_count: number;
    is_group: boolean;
    interest_id: string;
    city: string;
  }) => {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return proposal;
  },

  // Teklifi sil
  deleteProposal: async (proposalId: string) => {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId);

    if (error) throw error;
  },

  // Başvuruyu kabul et
  acceptRequest: async (requestId: string, proposalId: string, requesterId: string, userId: string) => {
    // Başvuruyu kabul et
    const { error: updateError } = await supabase
      .from('proposal_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Match oluştur (duplicate kontrolü ile)
    const user1 = userId < requesterId ? userId : requesterId;
    const user2 = userId < requesterId ? requesterId : userId;

    // Önce var mı kontrol et
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .maybeSingle();

    if (existingMatch) {
      return existingMatch;
    }

    // Yoksa oluştur
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        proposal_id: proposalId,
        user1_id: user1,
        user2_id: user2,
      })
      .select()
      .single();

    if (matchError) throw matchError;
    return match;
  },

  // Başvuruyu reddet
  rejectRequest: async (requestId: string) => {
    const { error } = await supabase
      .from('proposal_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
  },

  // Bekleyen başvuru sayısını al (optimize edilmiş)
  getPendingCount: async (userId: string) => {
    const { count } = await supabase
      .from('proposal_requests')
      .select('*, proposals!inner(creator_id)', { count: 'exact', head: true })
      .eq('proposals.creator_id', userId)
      .eq('status', 'pending');

    return count || 0;
  },
};
