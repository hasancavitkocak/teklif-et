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
    // Daha önce bu kullanıcılarla eşleşme olmuş mu kontrol et (silinmiş dahil)
    const user1 = userId < proposal.creator_id ? userId : proposal.creator_id;
    const user2 = userId < proposal.creator_id ? proposal.creator_id : userId;
    
    const { data: previousMatch } = await supabase
      .from('matches')
      .select('id, deleted_by')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .maybeSingle();

    // Eğer daha önce eşleşmişlerse (silinmiş bile olsa), otomatik eşleşme yapma
    if (previousMatch) {
      console.log('🚫 Daha önce eşleşmiş kullanıcılar - otomatik eşleşme yapılmıyor');
      return { matched: false, matchId: null };
    }
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

        // Aynı kullanıcılar aynı teklif için zaten eşleşmiş mi kontrol et (sadece aktif match'ler)
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('user1_id', user1)
          .eq('user2_id', user2)
          .eq('proposal_id', proposalId)
          .is('deleted_by', null) // Sadece aktif match'leri kontrol et
          .maybeSingle();

        if (!existingMatch) {
          // Teklif adını al
          const { data: proposalData } = await supabase
            .from('proposals')
            .select('activity_name')
            .eq('id', proposalId)
            .single();

          // Eşleşme oluştur
          await supabase
            .from('matches')
            .insert({
              proposal_id: proposalId,
              user1_id: user1,
              user2_id: user2,
              proposal_name: proposalData?.activity_name || 'Teklif',
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

    console.log('📍 Kullanıcı konumu:', {
      city: userProfile?.city,
      hasCoordinates: !!(userProfile?.latitude && userProfile?.longitude),
      lat: userProfile?.latitude,
      lng: userProfile?.longitude
    });

    // Eğer kullanıcının profil şehri ile GPS koordinatları uyumsuzsa, profil şehrini öncelikle
    const shouldUseProfileCity = userProfile?.city && 
      !userProfile?.city.toLowerCase().includes('istanbul') && 
      userProfile?.latitude && userProfile?.longitude;

    if (shouldUseProfileCity) {
      console.log('🏙️ Profil şehri GPS\'ten farklı, profil şehri kullanılacak:', userProfile.city);
    }

    // Daha önce başvuru yapılmış teklif ID'lerini al (tüm başvurular - rejected dahil)
    const { data: appliedData } = await supabase
      .from('proposal_requests')
      .select('proposal_id')
      .eq('requester_id', userId); // Tüm başvuruları hariç tut (pending, accepted, rejected)

    const appliedProposalIds = (appliedData || []).map((item: any) => item.proposal_id);
    console.log('🚫 Başvuru yapılan teklif sayısı:', appliedProposalIds.length);

    // Kullanıcının etkileşimde bulunduğu teklif ID'lerini al (like, dislike, super_like)
    const { data: interactedData } = await supabase
      .from('user_interactions')
      .select('proposal_id, interaction_type')
      .eq('user_id', userId);

    const likedProposalIds = (interactedData || [])
      .filter((item: any) => item.interaction_type === 'like' || item.interaction_type === 'super_like')
      .map((item: any) => item.proposal_id);
    
    const dislikedProposalIds = (interactedData || [])
      .filter((item: any) => item.interaction_type === 'dislike')
      .map((item: any) => item.proposal_id);

    console.log('👍 Like yapılan teklif sayısı:', likedProposalIds.length);
    console.log('👎 Dislike yapılan teklif sayısı:', dislikedProposalIds.length);

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

    // Başvuru yapılan ve like yapılan teklifleri hariç tut (dislike yapılanları henüz hariç tutma)
    const excludedIds = [...appliedProposalIds, ...likedProposalIds];
    if (excludedIds.length > 0) {
      query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }
    
    console.log('🚫 Toplam hariç tutulan teklif sayısı:', excludedIds.length);

    // Filtreler - şehir filtresi (profil şehri öncelikli)
    const cityToFilter = userProfile?.city;
    if (cityToFilter) {
      // Şehir adından il kısmını çıkar (örn: "Seyhan, Adana" -> "Adana")
      const cityParts = cityToFilter.split(',').map(part => part.trim());
      const province = cityParts.length > 1 ? cityParts[cityParts.length - 1] : cityToFilter;
      
      console.log('🏙️ Profil şehir filtresi:', cityToFilter, '->', province);
      
      // İl bazında filtrele (İstanbul, Ankara, Adana vs.)
      query = query.ilike('city', `%${province}%`);
    }
    
    // Manuel şehir filtresi (filtreleme panelinden)
    if (filters?.city) {
      // Şehir adından il kısmını çıkar (örn: "Maltepe, İstanbul" -> "İstanbul")
      const cityParts = filters.city.split(',').map(part => part.trim());
      const province = cityParts.length > 1 ? cityParts[cityParts.length - 1] : filters.city;
      
      console.log('🏙️ Manuel şehir filtresi:', filters.city, '->', province);
      
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

    // Boost edilenler önce, sonra rastgele - önce dislike yapılanları da hariç tutarak dene
    let tempQuery = query;
    if (dislikedProposalIds.length > 0) {
      tempQuery = tempQuery.not('id', 'in', `(${dislikedProposalIds.join(',')})`);
    }
    
    // Önce dislike yapılanları hariç tutarak dene
    const tempQueryWithLimit = tempQuery.order('is_boosted', { ascending: false }).limit(20);
    const { data: tempData, error: tempError } = await tempQueryWithLimit;
    
    // Eğer yeterli teklif varsa (en az 10 teklif), dislike yapılanları hariç tut
    if (!tempError && tempData && tempData.length >= 10) {
      query = tempQuery;
      console.log('✅ Yeterli teklif var, dislike yapılanlar hariç tutuluyor:', tempData.length);
    } else {
      console.log('⚠️ Yeterli teklif yok, dislike yapılanlar dahil ediliyor. Bulunan:', tempData?.length || 0);
    }
    
    // Final sorgu - mesafe filtresi SQL'de uygulanacak
    query = query.order('is_boosted', { ascending: false });
    
    // Proposals değişkenini tanımla
    let proposals: DiscoverProposal[] = [];
    
    // Mesafe filtresi varsa ve koordinatlar varsa, custom function kullan
    // Ama önce şehir filtresi uygulanmış olmalı
    if (filters?.maxDistance && userProfile?.latitude && userProfile?.longitude && !cityToFilter) {
      const maxDistance = filters.maxDistance || 50;
      console.log('📍 SQL mesafe filtresi uygulanıyor:', maxDistance, 'km');
      
      // Custom RPC function ile mesafe filtreli teklifleri getir
      const { data: filteredData, error: filteredError } = await supabase.rpc('get_proposals_within_distance', {
        user_lat: userProfile.latitude,
        user_lng: userProfile.longitude,
        max_distance_km: maxDistance,
        user_id: userId,
        excluded_proposal_ids: excludedIds,
        excluded_user_ids: [], // Eşleşmiş kullanıcıları hariç tutma
        limit_count: 20
      });
      
      if (filteredError) {
        console.log('⚠️ Mesafe filtresi RPC hatası, normal sorgu kullanılıyor:', filteredError);
        // Hata varsa normal sorguya devam et
        query = query.limit(20);
        const { data, error } = await query;
        if (error) throw error;
        proposals = (data || []) as DiscoverProposal[];
      } else {
        // RPC başarılı, sonuçları kullan
        proposals = (filteredData || []) as DiscoverProposal[];
        console.log('✅ SQL mesafe filtresi uygulandı, bulunan teklif sayısı:', proposals.length);
      }
    } else {
      // Mesafe filtresi yok veya şehir filtresi var, normal sorgu
      query = query.limit(20);
      const { data, error } = await query;
      if (error) throw error;
      proposals = (data || []) as DiscoverProposal[];
    }
    console.log('📋 Ham teklif sayısı:', proposals.length);

    // Frontend'te minimal filtreleme - sadece güvenlik için
    proposals = proposals.filter(proposal => {
      // Başvuru yapılan teklifleri hariç tut (double check)
      if (appliedProposalIds.includes(proposal.id)) {
        console.log('🚫 Frontend filtreleme: Başvuru yapılan teklif hariç tutuldu:', proposal.activity_name);
        return false;
      }
      
      // Like yapılan teklifleri hariç tut (double check)
      if (likedProposalIds.includes(proposal.id)) {
        console.log('🚫 Frontend filtreleme: Like yapılan teklif hariç tutuldu:', proposal.activity_name);
        return false;
      }
      
      return true;
    });
    
    console.log('📋 Frontend filtreleme sonrası teklif sayısı:', proposals.length);

    // SQL'de mesafe hesaplandığı için frontend'te tekrar hesaplamaya gerek yok
    // Sadece mesafe bilgisi olmayan teklifler için varsayılan değer ata
    const proposalsWithDistance = proposals.map(proposal => {
      if (!proposal.distance) {
        // Eğer SQL'den mesafe gelmemişse (koordinat yoksa), tahmini mesafe ata
        const userCity = userProfile?.city?.toLowerCase() || '';
        const proposalCity = proposal.city?.toLowerCase() || '';
        
        let distance = 100; // Varsayılan
        if (userCity.includes('maltepe') && proposalCity.includes('maltepe')) {
          distance = 5;
        } else if (userCity.includes('istanbul') && proposalCity.includes('istanbul')) {
          distance = 25;
        } else if (proposalCity.includes('gebze') || proposalCity.includes('darıca')) {
          distance = 45;
        }
        
        return { ...proposal, distance };
      }
      return proposal;
    });

    // SQL'de filtreleme yapıldığı için frontend'te minimal kontrol
    proposals = proposalsWithDistance.filter(proposal => {
      const creator = proposal.creator as any;
      
      // Sadece aktif kullanıcı kontrolü (SQL'de de var ama double check)
      if (creator.is_active === false) {
        return false;
      }
      
      return true;
    });

    // SQL'de sıralama yapıldığı için frontend'te minimal sıralama
    proposals = proposals.slice(0, 20); // Sadece limit uygula
    
    console.log('📋 Final teklif sayısı:', proposals.length);
    console.log('📋 İlk 3 teklif mesafeleri:', proposals.slice(0, 3).map(p => `${p.city} - ${p.distance?.toFixed(1) || '?'}km`));

    // Eğer hiç teklif kalmadıysa (5'ten az), dislike yapılan teklifleri tekrar göster
    if (proposals.length < 5 && dislikedProposalIds.length > 0) {
      console.log('🔄 Yeterli teklif yok, dislike yapılanları tekrar getiriliyor...', proposals.length);
      
      // Sadece dislike yapılan teklifleri getir (başvuru yapılmış ve like yapılmış olanları hariç tut)
      const excludeAppliedAndLiked = [...appliedProposalIds, ...likedProposalIds];
      
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

      // Başvuru yapılmış ve like yapılmış olanları hariç tut
      if (excludeAppliedAndLiked.length > 0) {
        retryQuery = retryQuery.not('id', 'in', `(${excludeAppliedAndLiked.join(',')})`);
      }

      // Aynı filtreleri uygula (şehir filtresi hariç - mesafe filtresi kullanıyoruz)
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
      
      let retryProposals = (retryData || []) as DiscoverProposal[];
      
      // Basit filtreleme - sadece aktif kullanıcı kontrolü
      retryProposals = retryProposals.filter(proposal => {
        const creator = proposal.creator as any;
        return creator.is_active !== false;
      });

      console.log(`🔄 Dislike yapılan ${retryProposals.length} teklif tekrar gösteriliyor`);
      
      // Mevcut tekliflerle birleştir (duplicate kontrolü ile)
      const existingIds = new Set(proposals.map(p => p.id));
      const newProposals = retryProposals.filter(p => !existingIds.has(p.id));
      
      return [...proposals, ...newProposals];
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
    try {
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
    
    } catch (error: any) {
      // Duplicate key hatalarını sessizce geç
      if (error.code === '23505') {
        console.log('⚠️ Duplicate like engellendi');
        return { matched: false };
      }
      throw error;
    }
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
