import { supabase } from '@/lib/supabase';

export interface UserInteraction {
  id: string;
  user_id: string;
  proposal_id: string;
  interaction_type: 'like' | 'dislike' | 'super_like';
  created_at: string;
}

export const userInteractionsAPI = {
  // Kullanıcı etkileşimini kaydet (dislike, like, super_like)
  recordInteraction: async (
    userId: string,
    proposalId: string,
    interactionType: 'like' | 'dislike' | 'super_like'
  ) => {
    try {
      // Daha önce bu teklifle etkileşim var mı kontrol et
      const { data: existingInteraction } = await supabase
        .from('user_interactions')
        .select('id, interaction_type')
        .eq('user_id', userId)
        .eq('proposal_id', proposalId)
        .maybeSingle();

      if (existingInteraction) {
        // Aynı etkileşim tipiyse hiçbir şey yapma
        if (existingInteraction.interaction_type === interactionType) {
          console.log(`⚠️ Aynı etkileşim zaten mevcut: ${interactionType}`);
          return;
        }
        
        // Mevcut etkileşimi güncelle
        const { error } = await supabase
          .from('user_interactions')
          .update({
            interaction_type: interactionType,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInteraction.id);

        if (error) throw error;
        
        console.log(`🔄 Etkileşim güncellendi: ${existingInteraction.interaction_type} -> ${interactionType}`);
      } else {
        // Yeni etkileşim kaydet - upsert kullan (duplicate safe)
        const { error } = await supabase
          .from('user_interactions')
          .upsert({
            user_id: userId,
            proposal_id: proposalId,
            interaction_type: interactionType
          }, {
            onConflict: 'user_id,proposal_id'
          });

        if (error) throw error;
        
        console.log(`✅ Yeni etkileşim kaydedildi: ${interactionType}`);
      }
    } catch (error: any) {
      // Duplicate key hatası durumunda sessizce geç
      if (error.code === '23505') {
        console.log(`⚠️ Duplicate etkileşim engellendi: ${interactionType}`);
        return;
      }
      throw error;
    }
  },

  // Kullanıcının etkileşimde bulunduğu teklif ID'lerini getir
  getUserInteractedProposalIds: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('proposal_id, interaction_type')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(item => ({
      proposalId: item.proposal_id,
      interactionType: item.interaction_type as 'like' | 'dislike' | 'super_like'
    }));
  },

  // Sadece dislike yapılan teklif ID'lerini getir
  getDislikedProposalIds: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('proposal_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'dislike');

    if (error) throw error;

    return (data || []).map(item => item.proposal_id);
  },

  // Kullanıcının belirli bir teklifle etkileşimi var mı?
  hasUserInteracted: async (userId: string, proposalId: string) => {
    const { data, error } = await supabase
      .from('user_interactions')
      .select('interaction_type')
      .eq('user_id', userId)
      .eq('proposal_id', proposalId)
      .maybeSingle();

    if (error) throw error;

    return data ? data.interaction_type : null;
  }
};