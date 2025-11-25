import { supabase } from '@/lib/supabase';

export interface ProposalInvitation {
  id: string;
  proposal_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string;
  proposal?: {
    id: string;
    activity_name: string;
    city: string;
    interest: {
      name: string;
    };
  };
  inviter?: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
  invited_user?: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
}

export const invitationsAPI = {
  // Kullanıcıları teklife davet et
  inviteUsers: async (proposalId: string, inviterId: string, userIds: string[]) => {
    const invitations = userIds.map(userId => ({
      proposal_id: proposalId,
      inviter_id: inviterId,
      invited_user_id: userId,
    }));

    const { data, error } = await supabase
      .from('proposal_invitations')
      .insert(invitations)
      .select();

    if (error) throw error;
    return data;
  },

  // Tek kullanıcıyı davet et
  inviteUser: async (proposalId: string, inviterId: string, userId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .insert({
        proposal_id: proposalId,
        inviter_id: inviterId,
        invited_user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Gönderilen davetleri getir (teklif sahibi için)
  getSentInvitations: async (inviterId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .select(`
        id,
        proposal_id,
        inviter_id,
        invited_user_id,
        status,
        created_at,
        responded_at,
        proposal:proposals!proposal_id(
          id,
          activity_name,
          city,
          interest:interests(name)
        ),
        invited_user:profiles!invited_user_id(
          name,
          profile_photo,
          birth_date
        )
      `)
      .eq('inviter_id', inviterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Supabase relation'ları array döndürür, düzelt
    return (data || []).map((inv: any) => ({
      ...inv,
      proposal: Array.isArray(inv.proposal) ? inv.proposal[0] : inv.proposal,
      invited_user: Array.isArray(inv.invited_user) ? inv.invited_user[0] : inv.invited_user,
    })) as ProposalInvitation[];
  },

  // Alınan davetleri getir (davet edilen kullanıcı için)
  getReceivedInvitations: async (userId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .select(`
        id,
        proposal_id,
        inviter_id,
        invited_user_id,
        status,
        created_at,
        responded_at,
        proposal:proposals!proposal_id(
          id,
          activity_name,
          city,
          interest:interests(name)
        ),
        inviter:profiles!inviter_id(
          name,
          profile_photo,
          birth_date
        )
      `)
      .eq('invited_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Supabase relation'ları array döndürür, düzelt
    return (data || []).map((inv: any) => ({
      ...inv,
      proposal: Array.isArray(inv.proposal) ? inv.proposal[0] : inv.proposal,
      inviter: Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter,
    })) as ProposalInvitation[];
  },

  // Belirli bir teklif için gönderilen davetleri getir
  getInvitationsForProposal: async (proposalId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .select(`
        id,
        proposal_id,
        inviter_id,
        invited_user_id,
        status,
        created_at,
        responded_at,
        invited_user:profiles!invited_user_id(
          name,
          profile_photo,
          birth_date
        )
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Supabase relation'ları array döndürür, düzelt
    return (data || []).map((inv: any) => ({
      ...inv,
      invited_user: Array.isArray(inv.invited_user) ? inv.invited_user[0] : inv.invited_user,
    })) as ProposalInvitation[];
  },

  // Daveti kabul et
  acceptInvitation: async (invitationId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Daveti reddet
  declineInvitation: async (invitationId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Daveti iptal et (sadece pending olanlar)
  cancelInvitation: async (invitationId: string) => {
    const { error } = await supabase
      .from('proposal_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) throw error;
  },

  // Bekleyen davet sayısını al
  getPendingInvitationsCount: async (userId: string) => {
    const { count } = await supabase
      .from('proposal_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invited_user_id', userId)
      .eq('status', 'pending');

    return count || 0;
  },

  // Kullanıcının bu teklife zaten davet edilip edilmediğini kontrol et
  checkIfAlreadyInvited: async (proposalId: string, userId: string) => {
    const { data, error } = await supabase
      .from('proposal_invitations')
      .select('id, status')
      .eq('proposal_id', proposalId)
      .eq('invited_user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Davet edilebilecek kullanıcıları getir (filtrelerle)
  // Basitleştirilmiş: Aynı şehirdeki TÜM kullanıcıları göster (ilgi alanı kontrolü yok)
  getInvitableUsers: async (
    proposalId: string,
    currentUserId: string,
    filters?: {
      city?: string;
      interestId?: string;
      minAge?: number;
      maxAge?: number;
      gender?: 'all' | 'male' | 'female';
    }
  ) => {
    // Önce teklif bilgilerini al
    const { data: proposal } = await supabase
      .from('proposals')
      .select('city, interest_id')
      .eq('id', proposalId)
      .single();

    if (!proposal) return [];

    // Filtreleri uygula (varsayılan olarak teklif bilgilerini kullan)
    const targetCity = filters?.city || proposal.city;

    // Şehir bilgisinden il adını çıkar (örn: "Kadıköy, İstanbul" -> "İstanbul")
    const cityParts = targetCity.split(',');
    const provinceName = cityParts.length > 1 ? cityParts[1].trim() : targetCity;

    console.log('Searching users in city:', {
      targetCity,
      provinceName,
    });

    // Aynı şehirdeki TÜM kullanıcıları getir (ilgi alanı kontrolü YOK)
    let query = supabase
      .from('profiles')
      .select('id, name, profile_photo, birth_date, city, gender, latitude, longitude')
      .neq('id', currentUserId);

    // Cinsiyet filtresi
    if (filters?.gender && filters.gender !== 'all') {
      query = query.eq('gender', filters.gender);
    }

    const { data: allUsers, error } = await query.limit(500);

    console.log('Total users found:', allUsers?.length || 0);

    if (error) {
      console.error('Query error:', error);
      throw error;
    }
    
    if (!allUsers || allUsers.length === 0) {
      console.log('No users found');
      return [];
    }

    // Teklif koordinatlarını al
    const { data: proposalData } = await supabase
      .from('proposals')
      .select('latitude, longitude')
      .eq('id', proposalId)
      .single();

    // Mesafe hesaplama fonksiyonu (Haversine)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Dünya'nın yarıçapı (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Koordinat bazlı veya şehir bazlı filtreleme
    const users = allUsers.filter(user => {
      if (!user.city) return false;
      
      // Eğer her ikisinin de koordinatı varsa mesafe bazlı filtrele (50km)
      if (
        proposalData?.latitude && 
        proposalData?.longitude && 
        user.latitude && 
        user.longitude
      ) {
        const distance = calculateDistance(
          proposalData.latitude,
          proposalData.longitude,
          user.latitude,
          user.longitude
        );
        return distance <= 50; // 50 km yarıçap
      }
      
      // Koordinat yoksa şehir bazlı filtrele (eski yöntem)
      const userCity = user.city.toLowerCase().trim();
      const targetProvince = provinceName.toLowerCase().trim();
      const targetCityLower = targetCity.toLowerCase().trim();
      
      return (
        userCity === targetProvince ||
        userCity.includes(targetProvince) ||
        targetCityLower.includes(userCity) ||
        userCity.includes(targetCityLower) ||
        userCity.split(',').some((part: string) =>
          part.trim() === targetProvince
        )
      );
    });

    console.log('After city filter:', {
      before: allUsers.length,
      after: users.length,
      provinceName,
      sampleUserCities: users.slice(0, 5).map(u => u.city),
    });

    if (users.length === 0) {
      console.log('No users in target city. Sample cities:', 
        allUsers.slice(0, 10).map(u => u.city)
      );
      return [];
    }

    // Yaş filtresi (client-side)
    let filteredUsers = users;
    if (filters?.minAge || filters?.maxAge) {
      const today = new Date();
      const beforeAgeFilter = filteredUsers.length;
      filteredUsers = users.filter(user => {
        const birthDate = new Date(user.birth_date);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        const minAge = filters?.minAge || 18;
        const maxAge = filters?.maxAge || 100;
        return age >= minAge && age <= maxAge;
      });
      console.log('After age filter:', {
        before: beforeAgeFilter,
        after: filteredUsers.length,
        ageRange: `${filters?.minAge || 18}-${filters?.maxAge || 100}`,
      });
    }

    // Davet edilmiş ve başvuru yapmış kullanıcıları tek sorguda al
    const userIds = filteredUsers.map(u => u.id);
    if (userIds.length === 0) {
      console.log('No users after age filter');
      return [];
    }
    
    const [{ data: invitedUsers }, { data: requestedUsers }] = await Promise.all([
      supabase
        .from('proposal_invitations')
        .select('invited_user_id')
        .eq('proposal_id', proposalId)
        .in('invited_user_id', userIds),
      supabase
        .from('proposal_requests')
        .select('requester_id')
        .eq('proposal_id', proposalId)
        .in('requester_id', userIds),
    ]);

    console.log('Exclusions:', {
      invited: invitedUsers?.length || 0,
      requested: requestedUsers?.length || 0,
    });

    const excludedIds = new Set([
      ...(invitedUsers || []).map(inv => inv.invited_user_id),
      ...(requestedUsers || []).map(req => req.requester_id),
    ]);

    // Client-side filtreleme
    const finalUsers = filteredUsers.filter(user => !excludedIds.has(user.id)).slice(0, 50);
    
    console.log('Final result:', {
      totalAfterFilters: filteredUsers.length,
      excluded: excludedIds.size,
      final: finalUsers.length,
    });

    return finalUsers;
  },
};
