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

// Eşleşme kontrolü için yardımcı fonksiyon
const checkForMatch = async (proposalId: string, userId: string) => {
  // Karşılıklı başvuru kontrolü (otomatik eşleşme) - sadece aktif başvurular
  const { data: proposal } = await supabase
    .from('proposals')
    .select('creator_id')
    .eq('id', proposalId)
    .single();

  if (proposal) {
    // Sadece pending veya accepted status'lu başvuruları kontrol et
    const { data: reverseRequest } = await supabase
      .from('proposal_requests')
      .select('id, proposal_id, status')
      .eq('requester_id', proposal.creator_id)
      .in('status', ['pending', 'accepted']) // Reddedilmiş başvuruları hariç tut
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

        // Aynı kullanıcılar aynı teklif için zaten eşleşmiş mi kontrol et
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('user1_id', user1)
          .eq('user2_id', user2)
          .eq('proposal_id', proposalId)
          .maybeSingle();

        if (!existingMatch) {
          // Eşleşme oluştur
          await supabase
            .from('matches')
            .insert({
              proposal_id: proposalId,
              user1_id: user1,
              user2_id: user2,
            });

          // Her iki başvurunun da status'unu accepted yap
          await Promise.all([
            // Mevcut başvuru
            supabase
              .from('proposal_requests')
              .update({ status: 'accepted' })
              .eq('proposal_id', proposalId)
              .eq('requester_id', userId),
            
            // Karşılıklı başvuru
            supabase
              .from('proposal_requests')
              .update({ status: 'accepted' })
              .eq('id', reverseRequest.id)
          ]);

          // Eşleşme bildirimi gönder (arka planda)
          (async () => {
            try {
              const { data: users } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', [user1, user2]);

              if (users && users.length === 2) {
                const user1Data = users.find(u => u.id === user1);
                const user2Data = users.find(u => u.id === user2);

                if (user1Data && user2Data) {
                  const { notificationsAPI } = await import('./notifications');
                  await Promise.all([
                    notificationsAPI.sendMatchNotification(user1, user2Data.name),
                    notificationsAPI.sendMatchNotification(user2, user1Data.name),
                  ]);
                }
              }
            } catch (error: any) {
              console.error('Eşleşme bildirimi gönderme hatası:', error);
            }
          })();

          return { matched: true };
        }
      }
    }
  }

  return { matched: false };
};

export const discoverAPI = {
  // Keşfet sayfası için teklifleri getir (yeni kullanıcılar için de çalışır)
  getProposals: async (userId: string, filters?: { 
    city?: string; 
    interestId?: string;
    minAge?: number;
    maxAge?: number;
    gender?: string;
    maxDistance?: number; // km cinsinden
    eventDate?: string; // ISO string formatında tarih
  }) => {
    // Kullanıcının koordinatlarını al (mesafe filtrelemesi için)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('latitude, longitude, city')
      .eq('id', userId)
      .single();

    // Daha önce başvuru yapılmış teklif ID'lerini al (tüm başvurular - rejected dahil)
    const { data: appliedData } = await supabase
      .from('proposal_requests')
      .select('proposal_id')
      .eq('requester_id', userId); // Tüm başvuruları hariç tut (pending, accepted, rejected)

    const appliedProposalIds = (appliedData || []).map((item: any) => item.proposal_id);

    // Kullanıcının etkileşimde bulunduğu teklif ID'lerini al (like, dislike, super_like)
    const { data: interactedData } = await supabase
      .from('user_interactions')
      .select('proposal_id, interaction_type')
      .eq('user_id', userId);

    const interactedProposalIds = (interactedData || []).map((item: any) => item.proposal_id);
    const dislikedProposalIds = (interactedData || [])
      .filter((item: any) => item.interaction_type === 'dislike')
      .map((item: any) => item.proposal_id);

    // Eşleşmiş kullanıcıların ID'lerini al
    const { data: matchedData } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .is('deleted_by', null)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    const matchedUserIds = (matchedData || []).flatMap(match => {
      if (match.user1_id === userId) return [match.user2_id];
      if (match.user2_id === userId) return [match.user1_id];
      return [];
    });

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

    // Eşleşmiş kullanıcıların tekliflerini hariç tut
    if (matchedUserIds.length > 0) {
      query = query.not('creator_id', 'in', `(${matchedUserIds.join(',')})`);
    }

    // Daha önce başvuru yapılmış teklifleri hariç tut
    if (appliedProposalIds.length > 0) {
      query = query.not('id', 'in', `(${appliedProposalIds.join(',')})`);
    }

    // Etkileşimde bulunulan teklifleri hariç tut (like, dislike, super_like)
    // Ancak tüm teklifler gösterildikten sonra dislike'ları tekrar gösterebiliriz
    const allExcludedIds = [...appliedProposalIds, ...interactedProposalIds];
    if (allExcludedIds.length > 0) {
      query = query.not('id', 'in', `(${allExcludedIds.join(',')})`);
    }

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

    // Tarih filtresi
    if (filters?.eventDate) {
      // Seçilen tarihin başlangıcı ve bitişi (00:00:00 - 23:59:59)
      const selectedDate = new Date(filters.eventDate);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log('📅 Tarih filtresi:', startOfDay.toISOString(), '-', endOfDay.toISOString());
      
      // Sadece seçilen tarih aralığındaki teklifleri getir
      query = query
        .gte('event_datetime', startOfDay.toISOString())
        .lte('event_datetime', endOfDay.toISOString());
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

    // Eğer hiç teklif kalmadıysa, dislike yapılan teklifleri tekrar göster
    if (proposals.length === 0 && dislikedProposalIds.length > 0) {
      console.log('🔄 Tüm teklifler gösterildi, dislike yapılanları tekrar getiriliyor...');
      
      // Sadece dislike yapılan teklifleri getir (başvuru yapılmış olanları hariç tut)
      const excludeOnlyApplied = appliedProposalIds;
      
      let retryQuery = supabase
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
        .neq('creator_id', userId)
        .or('event_datetime.is.null,event_datetime.gte.' + new Date().toISOString())
        .in('id', dislikedProposalIds); // Sadece dislike yapılanları getir

      // Eşleşmiş kullanıcıların tekliflerini hariç tut
      if (matchedUserIds.length > 0) {
        retryQuery = retryQuery.not('creator_id', 'in', `(${matchedUserIds.join(',')})`);
      }

      // Başvuru yapılmış olanları hariç tut
      if (excludeOnlyApplied.length > 0) {
        retryQuery = retryQuery.not('id', 'in', `(${excludeOnlyApplied.join(',')})`);
      }

      // Aynı filtreleri uygula
      if (filters?.city) {
        const cityParts = filters.city.split(',').map(part => part.trim());
        const province = cityParts.length > 1 ? cityParts[cityParts.length - 1] : filters.city;
        retryQuery = retryQuery.ilike('city', `%${province}%`);
      }
      if (filters?.interestId) {
        retryQuery = retryQuery.eq('interest_id', filters.interestId);
      }
      if (filters?.eventDate) {
        const selectedDate = new Date(filters.eventDate);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        retryQuery = retryQuery
          .gte('event_datetime', startOfDay.toISOString())
          .lte('event_datetime', endOfDay.toISOString());
      }

      retryQuery = retryQuery.order('is_boosted', { ascending: false }).limit(20);

      const { data: retryData, error: retryError } = await retryQuery;
      
      if (retryError) throw retryError;
      
      let retryProposals = (retryData || []) as any as DiscoverProposal[];
      
      // Aynı filtreleri uygula (aktif kullanıcı, mesafe, yaş, cinsiyet)
      retryProposals = retryProposals.filter(proposal => {
        const creator = proposal.creator as any;
        
        if (creator.is_active === false) return false;

        // Mesafe filtresi
        if (userProfile?.latitude && userProfile?.longitude && creator.latitude && creator.longitude) {
          const distance = calculateDistance(
            userProfile.latitude, 
            userProfile.longitude, 
            creator.latitude, 
            creator.longitude
          );
          const maxDistance = filters?.maxDistance || 50;
          if (distance > maxDistance) return false;
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

      console.log(`🔄 Dislike yapılan ${retryProposals.length} teklif tekrar gösteriliyor`);
      return retryProposals;
    }

    return proposals;
  },

  // Mesafe hesaplama fonksiyonu (helper)
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Mesafe km cinsinden
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

    // Daha önce başvuru yapılmış mı kontrol et (tüm durumlar)
    const { data: existingRequest } = await supabase
      .from('proposal_requests')
      .select('id, status')
      .eq('proposal_id', proposalId)
      .eq('requester_id', userId)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new Error('Bu teklife daha önce başvurdunuz');
      } else if (existingRequest.status === 'accepted') {
        throw new Error('Bu teklifle zaten eşleştiniz');
      } else if (existingRequest.status === 'rejected') {
        // Reddedilmiş başvuruyu güncelle (yeni şans ver)
        const { error: updateError } = await supabase
          .from('proposal_requests')
          .update({
            status: 'pending',
            is_super_like: isSuperLike,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRequest.id);

        if (updateError) throw updateError;

        console.log('🔄 Reddedilmiş başvuru güncellendi:', existingRequest.id);
        
        // Günlük eşleşme isteği kotasını kullan
        const { data: useRequestResult, error: useRequestError } = await supabase.rpc('use_daily_request_quota', {
          p_user_id: userId
        });

        if (useRequestError) throw useRequestError;
        if (!useRequestResult) {
          throw new Error('Günlük eşleşme isteği kotası kontrolü başarısız oldu');
        }

        // Super like kullanıldıysa sayacı güncelle
        if (isSuperLike) {
          await supabase.rpc('use_super_like', { p_user_id: userId });
        }

        // Notification gönder ve eşleşme kontrol et (aşağıdaki kodla devam et)
        // Bu durumda yeni başvuru oluşturmaya gerek yok, güncelleme yaptık
        const skipNewRequest = true;
        
        // Notification ve eşleşme kontrolü için aşağıdaki koda geç
        if (skipNewRequest) {
          // Notification gönder (arka planda)
          Promise.all([
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
          ]).then(async ([proposalResult, requesterResult]) => {
            if (proposalResult.data && requesterResult.data) {
              try {
                const { notificationsAPI } = await import('./notifications');
                await notificationsAPI.sendNewProposalRequestNotification(
                  proposalResult.data.creator_id,
                  requesterResult.data.name,
                  proposalResult.data.activity_name,
                  isSuperLike
                );
              } catch (error: any) {
                console.error('Yeni teklif bildirimi gönderme hatası:', error);
              }
            }
          }).catch((error: any) => {
            console.error('Bildirim verisi alma hatası:', error);
          });

          // Eşleşme kontrolü yap ve sonucu döndür
          return await checkForMatch(proposalId, userId);
        }
      }
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

    // Super like kullanıldıysa sayacı güncelle (sadece bir kez)
    if (isSuperLike) {
      await supabase.rpc('use_super_like', { p_user_id: userId });
    }

    // Yeni teklif bildirimi gönder (arka planda, ana işlemi bloklamadan)
    Promise.all([
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
    ]).then(async ([proposalResult, requesterResult]) => {
      if (proposalResult.data && requesterResult.data) {
        try {
          const { notificationsAPI } = await import('./notifications');
          await notificationsAPI.sendNewProposalRequestNotification(
            proposalResult.data.creator_id,
            requesterResult.data.name,
            proposalResult.data.activity_name,
            isSuperLike
          );
        } catch (error: any) {
          console.error('Yeni teklif bildirimi gönderme hatası:', error);
        }
      }
    }).catch((error: any) => {
      console.error('Bildirim verisi alma hatası:', error);
    });

    return await checkForMatch(proposalId, userId);
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
