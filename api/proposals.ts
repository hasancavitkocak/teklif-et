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
    id?: string;
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
    event_datetime?: string;
    venue_name?: string;
    interest?: {
      id: string;
      name: string;
    };
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
        interest:interests(id, name)
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

  // Gelen başvuruları getir
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
          creator_id
        ),
        requester:profiles!requester_id(
          name,
          profile_photo,
          birth_date
        )
      `)
      .eq('proposals.creator_id', userId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Creator bilgilerini tek sorguda çek
    const validRequests = (data || []).filter((request: any) => request.proposal !== null);
    if (validRequests.length === 0) return [];

    const creatorIds = [...new Set(validRequests.map((r: any) => r.proposal.creator_id))];
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, name, profile_photo, birth_date')
      .in('id', creatorIds);

    const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

    return validRequests.map((request: any) => ({
      ...request,
      requester: request.requester || { name: 'Unknown', profile_photo: '', birth_date: '2000-01-01' },
      proposal: {
        ...request.proposal,
        creator: creatorMap.get(request.proposal.creator_id) || { name: 'Unknown', profile_photo: '', birth_date: '2000-01-01' },
      },
    })) as any as ProposalRequest[];
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
        requester_id,
        proposal:proposals!proposal_id(
          id,
          activity_name,
          city,
          creator_id
        ),
        requester:profiles!requester_id(
          name,
          profile_photo,
          birth_date
        )
      `)
      .eq('requester_id', userId)
      .neq('status', 'auto_rejected')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Creator bilgilerini tek sorguda çek
    const validRequests = (data || []).filter((request: any) => request.proposal !== null);
    if (validRequests.length === 0) return [];

    const creatorIds = [...new Set(validRequests.map((r: any) => r.proposal.creator_id))];
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, name, profile_photo, birth_date')
      .in('id', creatorIds);

    const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

    return validRequests.map((request: any) => ({
      ...request,
      requester: request.requester || { name: 'Unknown', profile_photo: '', birth_date: '2000-01-01' },
      proposal: {
        ...request.proposal,
        creator: creatorMap.get(request.proposal.creator_id) || { name: 'Unknown', profile_photo: '', birth_date: '2000-01-01' },
      },
    })) as any as ProposalRequest[];
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
    latitude?: number;
    longitude?: number;
    event_datetime?: string;
    venue_name?: string;
  }) => {
    // Önce teklif kredisi kontrolü yap
    const { data: canCreate, error: checkError } = await supabase.rpc('can_create_proposal', {
      p_user_id: data.creator_id
    });

    if (checkError) throw checkError;

    if (!canCreate) {
      throw new Error('Teklif krediniz yetersiz');
    }

    // Teklif kredisini düş
    const { data: useResult, error: useError } = await supabase.rpc('use_proposal_credit', {
      p_user_id: data.creator_id
    });

    if (useError) throw useError;

    if (!useResult) {
      throw new Error('Teklif kredisi kontrolü başarısız oldu');
    }

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

    // Push notification gönder
    try {
      // Teklif ve kullanıcı bilgilerini al
      const [proposalResult, userResult] = await Promise.all([
        supabase
          .from('proposals')
          .select('activity_name')
          .eq('id', proposalId)
          .single(),
        supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single()
      ]);

      if (proposalResult.data && userResult.data) {
        // Push notification gönder (dinamik import)
        const { notificationsAPI } = await import('./notifications');
        await notificationsAPI.sendProposalNotification(
          requesterId,
          userResult.data.name,
          true, // kabul edildi
          proposalResult.data.activity_name
        );
      }
    } catch (error) {
      console.error('Teklif kabul bildirimi gönderme hatası:', error);
    }

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
    // Önce request bilgilerini al (push notification için)
    const { data: requestData } = await supabase
      .from('proposal_requests')
      .select(`
        requester_id,
        proposal:proposals(id, activity_name, creator_id)
      `)
      .eq('id', requestId)
      .single();

    const { error } = await supabase
      .from('proposal_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;

    // Push notification gönder
    try {
      if (requestData?.proposal) {
        // Teklif sahibinin adını al
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', (requestData.proposal as any).creator_id)
          .single();

        if (creatorData) {
          // Push notification gönder (dinamik import)
          const { notificationsAPI } = await import('./notifications');
          await notificationsAPI.sendProposalNotification(
            requestData.requester_id,
            creatorData.name,
            false, // reddedildi
            (requestData.proposal as any).activity_name
          );
        }
      }
    } catch (error) {
      console.error('Teklif red bildirimi gönderme hatası:', error);
    }
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
