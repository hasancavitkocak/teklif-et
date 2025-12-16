import { supabase } from '@/lib/supabase';

export interface DiscoverProposal {
  id: string;
  activity_name: string;
  city: string;
  is_boosted: boolean;
  creator_id: string;
  event_datetime?: string;
  venue_name?: string;
  creator: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
  interest: {
    name: string;
  };
}

export const discoverAPI = {
  // Keşfet sayfası için teklifleri getir (yeni kullanıcılar için de çalışır)
  getProposals: async (userId: string, filters?: { 
    city?: string; 
    interestId?: string;
    minAge?: number;
    maxAge?: number;
    gender?: string;
    maxDistance?: number; // km cinsinden
  }) => {
    // Kullanıcının koordinatlarını al (mesafe filtrelemesi için)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('latitude, longitude, city')
      .eq('id', userId)
      .single();

    // Daha önce başvuru yapılmış teklif ID'lerini al (sadece bunları hariç tut)
    const { data: appliedData } = await supabase
      .from('proposal_requests')
      .select('proposal_id')
      .eq('requester_id', userId);

    const appliedProposalIds = (appliedData || []).map((item: any) => item.proposal_id);

    // Tüm aktif teklifleri getir (koordinatlar dahil - mesafe hesaplaması için)
    let query = supabase
      .from('proposals')
      .select(`
        id,
        activity_name,
        city,
        is_boosted,
        interest_id,
        creator_id,
        event_datetime,
        venue_name,
        creator:profiles!creator_id(name, profile_photo, birth_date, gender, is_active, latitude, longitude),
        interest:interests(name)
      `)
      .eq('status', 'active')
      .neq('creator_id', userId) // Kendi tekliflerini gösterme
      .or('event_datetime.is.null,event_datetime.gte.' + new Date().toISOString()); // Expired olmayan teklifler

    // Daha önce başvuru yapılmış teklifleri hariç tut
    if (appliedProposalIds.length > 0) {
      query = query.not('id', 'in', `(${appliedProposalIds.join(',')})`);
    }

    // Geçilen teklifleri frontend'te filtreleyeceğiz

    // Filtreler - şehir filtresi
    if (filters?.city) {
      // Şehir adından il kısmını çıkar (örn: "Maltepe, İstanbul" -> "İstanbul")
      const cityParts = filters.city.split(',').map(part => part.trim());
      const province = cityParts.length > 1 ? cityParts[cityParts.length - 1] : filters.city;
      
      console.log('🏙️ Şehir filtresi:', filters.city, '->', province);
      
      // İl bazında filtrele (İstanbul, Ankara, İzmir vs.)
      query = query.ilike('city', `%${province}%`);
    }
    if (filters?.interestId) {
      query = query.eq('interest_id', filters.interestId);
    }

    // Boost edilenler önce, sonra rastgele
    query = query.order('is_boosted', { ascending: false }).limit(20);

    const { data, error } = await query;

    if (error) throw error;

    let proposals = (data || []) as any as DiscoverProposal[];
    
    console.log('📋 Ham teklif sayısı:', proposals.length);
    console.log('📋 İlk 3 teklif şehirleri:', proposals.slice(0, 3).map(p => p.city));

    // Mesafe hesaplama fonksiyonu (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Dünya'nın yarıçapı (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Mesafe km cinsinden
    };

    // Aktif olmayan kullanıcıları filtrele ve mesafe filtrelemesi
    proposals = proposals.filter(proposal => {
      const creator = proposal.creator as any;
      
      // Sadece aktif kullanıcıları göster
      if (creator.is_active === false) {
        return false;
      }

      // Mesafe filtresi (koordinatlar varsa)
      if (userProfile?.latitude && userProfile?.longitude && creator.latitude && creator.longitude) {
        const distance = calculateDistance(
          userProfile.latitude, 
          userProfile.longitude, 
          creator.latitude, 
          creator.longitude
        );
        
        const maxDistance = filters?.maxDistance || 50; // Varsayılan 50 km
        
        console.log(`📍 Mesafe: ${creator.name} - ${distance.toFixed(1)} km (max: ${maxDistance} km)`);
        
        if (distance > maxDistance) {
          return false;
        }
      }
      
      // Yaş filtresi
      if (filters?.minAge || filters?.maxAge) {
        const birthDate = new Date(creator.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (filters.minAge && age < filters.minAge) return false;
        if (filters.maxAge && age > filters.maxAge) return false;
      }
      
      // Cinsiyet filtresi
      if (filters?.gender && filters.gender !== 'all') {
        if (creator.gender !== filters.gender) return false;
      }
      
      return true;
    });

    return proposals;
  },



  // Teklife başvur (like)
  likeProposal: async (
    proposalId: string,
    userId: string,
    isSuperLike: boolean = false
  ) => {
    // Teklif kredisi kontrolü kaldırıldı - eşleşme isteği için gereksiz

    // Günlük eşleşme isteği limiti kontrolü
    const { data: canSendRequest, error: requestCheckError } = await supabase.rpc('can_send_request_today', {
      p_user_id: userId
    });

    if (requestCheckError) throw requestCheckError;

    if (!canSendRequest) {
      throw new Error('Günlük eşleşme isteği hakkınız bitti');
    }

    // Super like kontrolü - database fonksiyonu ile kontrol et
    if (isSuperLike) {
      const { data: canUse } = await supabase.rpc('can_use_super_like', { p_user_id: userId });
      if (!canUse) {
        throw new Error('Günlük super like hakkınız doldu');
      }
    }

    // Daha önce başvuru yapılmış mı kontrol et
    const { data: existingRequest } = await supabase
      .from('proposal_requests')
      .select('id')
      .eq('proposal_id', proposalId)
      .eq('requester_id', userId)
      .maybeSingle();

    if (existingRequest) {
      throw new Error('Bu teklife daha önce başvurdunuz');
    }

    // Günlük eşleşme isteği kotasını kullan
    const { data: useRequestResult, error: useRequestError } = await supabase.rpc('use_daily_request_quota', {
      p_user_id: userId
    });

    if (useRequestError) throw useRequestError;

    if (!useRequestResult) {
      throw new Error('Günlük eşleşme isteği kotası kontrolü başarısız oldu');
    }

    // Başvuru oluştur
    const { error } = await supabase
      .from('proposal_requests')
      .insert({
        proposal_id: proposalId,
        requester_id: userId,
        is_super_like: isSuperLike,
      });

    if (error) throw error;

    // Super like kullanıldıysa sayacı güncelle
    if (isSuperLike) {
      await supabase.rpc('use_super_like', { p_user_id: userId });
    }

    // Yeni teklif bildirimi gönder
    try {
      // Teklif ve kullanıcı bilgilerini al
      const [proposalResult, requesterResult] = await Promise.all([
        supabase
          .from('proposals')
          .select('creator_id, activity_name')
          .eq('id', proposalId)
          .single(),
        supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single()
      ]);

      if (proposalResult.data && requesterResult.data) {
        // Push notification gönder (dinamik import)
        const { notificationsAPI } = await import('./notifications');
        await notificationsAPI.sendNewProposalRequestNotification(
          proposalResult.data.creator_id,
          requesterResult.data.name,
          proposalResult.data.activity_name,
          isSuperLike
        );
      }
    } catch (error) {
      console.error('Yeni teklif bildirimi gönderme hatası:', error);
    }

    // Karşılıklı başvuru kontrolü (otomatik eşleşme)
    const { data: proposal } = await supabase
      .from('proposals')
      .select('creator_id')
      .eq('id', proposalId)
      .single();

    if (proposal) {
      const { data: reverseRequest } = await supabase
        .from('proposal_requests')
        .select('id, proposal_id')
        .eq('requester_id', proposal.creator_id)
        .maybeSingle();

      if (reverseRequest && reverseRequest.proposal_id) {
        const { data: myProposal } = await supabase
          .from('proposals')
          .select('id')
          .eq('creator_id', userId)
          .eq('id', reverseRequest.proposal_id)
          .maybeSingle();

        if (myProposal) {
          // Otomatik eşleşme oluştur (duplicate kontrolü ile)
          const user1 = userId < proposal.creator_id ? userId : proposal.creator_id;
          const user2 = userId < proposal.creator_id ? proposal.creator_id : userId;

          // Önce var mı kontrol et
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .eq('user1_id', user1)
            .eq('user2_id', user2)
            .maybeSingle();

          if (!existingMatch) {
            await supabase
              .from('matches')
              .insert({
                proposal_id: proposalId,
                user1_id: user1,
                user2_id: user2,
              });

            // Eşleşme bildirimi gönder
            try {
              // Her iki kullanıcının da adını al
              const { data: users } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', [user1, user2]);

              if (users && users.length === 2) {
                const user1Data = users.find(u => u.id === user1);
                const user2Data = users.find(u => u.id === user2);

                // Push notification gönder (dinamik import)
                const { notificationsAPI } = await import('./notifications');
                
                // Her iki kullanıcıya da bildirim gönder
                if (user1Data && user2Data) {
                  await Promise.all([
                    notificationsAPI.sendMatchNotification(user1, user2Data.name),
                    notificationsAPI.sendMatchNotification(user2, user1Data.name),
                  ]);
                }
              }
            } catch (error) {
              console.error('Eşleşme bildirimi gönderme hatası:', error);
            }
          }

          // Super like kullanıldıysa sayacı güncelle (teklif kredisi zaten düşürüldü)
          if (isSuperLike) {
            // Super like kullan
            await supabase.rpc('use_super_like', { p_user_id: userId });
          }

          return { matched: true };
        }
      }
    }

    // Super like kullanıldıysa sayacı güncelle (teklif kredisi zaten düşürüldü)
    if (isSuperLike) {
      // Super like kullan
      await supabase.rpc('use_super_like', { p_user_id: userId });
    }

    return { matched: false };
  },

  // Bugün için kalan eşleşme isteği sayısını al
  getRemainingRequestsToday: async (userId: string) => {
    const { data, error } = await supabase.rpc('get_remaining_requests_today', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  },

  // Günlük eşleşme isteği limitini al
  getDailyRequestLimit: async (userId: string) => {
    const { data, error } = await supabase.rpc('get_daily_request_limit', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  },
};
