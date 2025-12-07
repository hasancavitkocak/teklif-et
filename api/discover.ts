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
  }) => {
    // Daha önce gösterilmiş teklif ID'lerini al
    const { data: shownData } = await supabase
      .from('discover_feed')
      .select('proposal_id')
      .eq('user_id', userId)
      .eq('shown', true);

    const shownProposalIds = (shownData || []).map((item: any) => item.proposal_id);

    // Tüm aktif teklifleri getir (gösterilmemiş olanlar)
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
        creator:profiles!creator_id(name, profile_photo, birth_date, gender),
        interest:interests(name)
      `)
      .eq('status', 'active')
      .neq('creator_id', userId); // Kendi tekliflerini gösterme

    // Daha önce gösterilmiş teklifleri hariç tut
    if (shownProposalIds.length > 0) {
      query = query.not('id', 'in', `(${shownProposalIds.join(',')})`);
    }

    // Filtreler
    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters?.interestId) {
      query = query.eq('interest_id', filters.interestId);
    }

    // Boost edilenler önce, sonra rastgele
    query = query.order('is_boosted', { ascending: false }).limit(20);

    const { data, error } = await query;

    if (error) throw error;

    let proposals = (data || []) as any as DiscoverProposal[];

    // Yaş ve cinsiyet filtreleri (client-side, çünkü birth_date ve gender join ile geliyor)
    if (filters?.minAge || filters?.maxAge || filters?.gender) {
      proposals = proposals.filter(proposal => {
        const creator = proposal.creator;
        
        // Yaş filtresi
        if (filters.minAge || filters.maxAge) {
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
        if (filters.gender && filters.gender !== 'all') {
          const creatorGender = (creator as any).gender;
          if (creatorGender !== filters.gender) return false;
        }
        
        return true;
      });
    }

    return proposals;
  },

  // Teklif gösterildi olarak işaretle
  markAsShown: async (userId: string, proposalId: string) => {
    // Önce güncellemeyi dene
    const { data: updated, error: updateError } = await supabase
      .from('discover_feed')
      .update({ shown: true })
      .eq('user_id', userId)
      .eq('proposal_id', proposalId)
      .select();

    // Eğer güncelleme başarılıysa veya kayıt varsa, işlem tamam
    if (!updateError && updated && updated.length > 0) {
      return;
    }

    // Eğer kayıt yoksa, eklemeyi dene
    const { error: insertError } = await supabase
      .from('discover_feed')
      .insert({
        user_id: userId,
        proposal_id: proposalId,
        shown: true,
        position: 0,
      });

    // Duplicate key hatası görmezden gel (başka bir işlem eklemiş olabilir)
    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }
  },

  // Teklife başvur (like)
  likeProposal: async (
    proposalId: string,
    userId: string,
    isSuperLike: boolean = false
  ) => {
    // Kullanıcı limitlerini kontrol et
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_proposals_sent, daily_super_likes_used, is_premium, last_reset_date')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('Profil bulunamadı');

    // Günlük reset kontrolü
    const today = new Date().toISOString().split('T')[0];
    if (profile.last_reset_date !== today) {
      await supabase
        .from('profiles')
        .update({
          daily_proposals_sent: 0,
          daily_super_likes_used: 0,
          last_reset_date: today,
        })
        .eq('id', userId);
      profile.daily_proposals_sent = 0;
      profile.daily_super_likes_used = 0;
    }

    // Limit kontrolü
    if (!profile.is_premium && profile.daily_proposals_sent >= 5) {
      throw new Error('Günlük limit doldu. Premium olarak sınırsız teklif gönderebilirsiniz.');
    }

    if (isSuperLike && !profile.is_premium && profile.daily_super_likes_used >= 1) {
      throw new Error('Günlük super like hakkınız doldu');
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

    // Başvuru oluştur
    const { error } = await supabase
      .from('proposal_requests')
      .insert({
        proposal_id: proposalId,
        requester_id: userId,
        is_super_like: isSuperLike,
      });

    if (error) throw error;

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
          }

          // Limitler güncelle
          await supabase
            .from('profiles')
            .update({
              daily_proposals_sent: profile.daily_proposals_sent + 1,
              daily_super_likes_used: isSuperLike
                ? profile.daily_super_likes_used + 1
                : profile.daily_super_likes_used,
            })
            .eq('id', userId);

          return { matched: true };
        }
      }
    }

    // Limitler güncelle
    await supabase
      .from('profiles')
      .update({
        daily_proposals_sent: profile.daily_proposals_sent + 1,
        daily_super_likes_used: isSuperLike
          ? profile.daily_super_likes_used + 1
          : profile.daily_super_likes_used,
      })
      .eq('id', userId);

    return { matched: false };
  },
};
