import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface NotificationBadgeContextType {
  proposalCount: number;
  messageCount: number;
  proposalRequestCount: number; // Yeni: Tekliflerime gelen başvuru sayısı
  refreshProposalCount: () => Promise<void>;
  refreshMessageCount: () => Promise<void>;
  refreshProposalRequestCount: () => Promise<void>; // Yeni
  refreshAllCounts: () => Promise<void>;
  clearProposalCount: () => void;
  clearMessageCount: () => void;
  clearProposalRequestCount: () => void; // Yeni
}

const NotificationBadgeContext = createContext<NotificationBadgeContextType | undefined>(undefined);

export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [proposalCount, setProposalCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [proposalRequestCount, setProposalRequestCount] = useState(0); // Yeni

  // Teklif sayısını getir
  const refreshProposalCount = async () => {
    if (!user?.id) return;

    try {
      // RPC fonksiyonu ile kullanıcının tekliflerine gelen görülmemiş etkileşim sayısını al
      const { data, error } = await supabase.rpc('get_unviewed_proposal_count', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Teklif sayısı getirme hatası:', error);
        return;
      }

      setProposalCount(data || 0);
    } catch (error) {
      console.error('Teklif sayısı getirme hatası:', error);
    }
  };

  // Teklif başvuru sayısını getir (tekliflerime gelen pending başvurular)
  const refreshProposalRequestCount = async () => {
    if (!user?.id) return;

    try {
      // Kullanıcının tekliflerini ve her birinin başvuru sayısını al
      const { proposalsAPI } = await import('@/api/proposals');
      const myProposals = await proposalsAPI.getMyProposals(user.id);
      
      // Tüm tekliflerdeki pending başvuru sayılarını topla
      const totalRequestCount = myProposals.reduce((total, proposal) => {
        return total + (proposal.requests_count || 0);
      }, 0);

      setProposalRequestCount(totalRequestCount);
      console.log('📊 Toplam pending başvuru sayısı:', totalRequestCount);
    } catch (error) {
      console.error('Teklif başvuru sayısı getirme hatası:', error);
    }
  };
  const refreshMessageCount = async () => {
    if (!user?.id) return;

    try {
      // Kullanıcının katıldığı tüm konuşmaları getir
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matchesError) {
        console.error('Eşleşme getirme hatası:', matchesError);
        return;
      }

      if (!matches || matches.length === 0) {
        setMessageCount(0);
        return;
      }

      let unreadConversationCount = 0;

      // Her konuşma için okunmamış mesaj var mı kontrol et
      for (const match of matches) {
        const { data: unreadMessages, error: messagesError } = await supabase
          .from('messages')
          .select('id')
          .eq('match_id', match.id)
          .neq('sender_id', user.id) // Kendi gönderdiği mesajlar hariç
          .eq('read', false)
          .limit(1);

        if (messagesError) {
          console.error('Mesaj kontrol hatası:', messagesError);
          continue;
        }

        // Bu konuşmada okunmamış mesaj varsa sayacı artır
        if (unreadMessages && unreadMessages.length > 0) {
          unreadConversationCount++;
        }
      }

      setMessageCount(unreadConversationCount);
    } catch (error) {
      console.error('Mesaj sayısı getirme hatası:', error);
    }
  };

  // Tüm sayaçları yenile
  const refreshAllCounts = async () => {
    await Promise.all([
      refreshProposalCount(),
      refreshMessageCount(),
      refreshProposalRequestCount()
    ]);
  };

  // Sayaçları temizle
  const clearProposalCount = () => setProposalCount(0);
  const clearMessageCount = () => setMessageCount(0);
  const clearProposalRequestCount = () => setProposalRequestCount(0);

  // Kullanıcı değiştiğinde sayaçları yenile
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 NotificationBadgeContext başlatılıyor, user:', user.id);
      refreshAllCounts();
    } else {
      console.log('❌ User yok, sayaçlar sıfırlanıyor');
      setProposalCount(0);
      setMessageCount(0);
      setProposalRequestCount(0);
    }
  }, [user?.id]);

  // Real-time dinleme
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Real-time dinleme başlatılıyor...');

    // Yeni başvuru geldiğinde (proposal_requests tablosuna INSERT)
    const proposalRequestSubscription = supabase
      .channel(`proposal-requests-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'proposal_requests'
      }, async (payload) => {
        console.log('🆕 Yeni proposal request:', payload);
        
        // Bu başvurunun kullanıcının teklifine mi yapıldığını kontrol et
        const { data: proposal } = await supabase
          .from('proposals')
          .select('creator_id')
          .eq('id', payload.new.proposal_id)
          .single();
        
        if (proposal?.creator_id === user.id) {
          console.log('✅ Kullanıcının teklifine yeni başvuru geldi, sayaç güncelleniyor');
          refreshProposalRequestCount();
        }
      })
      .subscribe();

    // Başvuru durumu değiştiğinde (proposal_requests tablosunda UPDATE)
    const proposalRequestUpdateSubscription = supabase
      .channel(`proposal-requests-update-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'proposal_requests'
      }, async (payload) => {
        console.log('📝 Proposal request güncellendi:', payload);
        
        // Bu başvurunun kullanıcının teklifine mi ait olduğunu kontrol et
        const { data: proposal } = await supabase
          .from('proposals')
          .select('creator_id')
          .eq('id', payload.new.proposal_id)
          .single();
        
        if (proposal?.creator_id === user.id) {
          console.log('✅ Kullanıcının teklifindeki başvuru güncellendi, sayaç güncelleniyor');
          refreshProposalRequestCount();
        }
      })
      .subscribe();
    const proposalSubscription = supabase
      .channel(`user-interactions-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_interactions'
      }, async (payload) => {
        console.log('🆕 Yeni user_interaction:', payload);
        
        if (payload.new.interaction_type === 'like' || payload.new.interaction_type === 'super_like') {
          // Bu etkileşimin kullanıcının teklifine mi yapıldığını kontrol et
          const { data: proposal } = await supabase
            .from('proposals')
            .select('creator_id')
            .eq('id', payload.new.proposal_id)
            .single();
          
          if (proposal?.creator_id === user.id) {
            console.log('✅ Kullanıcının teklifine yeni etkileşim geldi, sayaç güncelleniyor');
            refreshProposalCount();
          }
        }
      })
      .subscribe();

    // Yeni mesaj geldiğinde
    const messageSubscription = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('🆕 Yeni mesaj:', payload);
        
        // Kendi gönderdiği mesaj değilse sayacı yenile
        if (payload.new.sender_id !== user.id) {
          console.log('✅ Başkasından mesaj geldi, sayaç güncelleniyor');
          refreshMessageCount();
        }
      })
      .subscribe();

    // Mesaj okunduğunda
    const messageReadSubscription = supabase
      .channel(`messages-read-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('📖 Mesaj okundu:', payload);
        
        // Mesaj okundu olarak işaretlendiyse sayacı yenile
        if (payload.new.read === true && payload.old.read === false) {
          console.log('✅ Mesaj okundu, sayaç güncelleniyor');
          refreshMessageCount();
        }
      })
      .subscribe();

    // Subscription durumlarını kontrol et
    setTimeout(() => {
      console.log('📡 Subscription durumları:');
      console.log('- Proposals:', proposalSubscription.state);
      console.log('- Messages:', messageSubscription.state);
      console.log('- Messages Read:', messageReadSubscription.state);
    }, 2000);

    return () => {
      console.log('🔌 Real-time dinleme kapatılıyor...');
      proposalRequestSubscription.unsubscribe();
      proposalRequestUpdateSubscription.unsubscribe();
      proposalSubscription.unsubscribe();
      messageSubscription.unsubscribe();
      messageReadSubscription.unsubscribe();
    };
  }, [user?.id]);

  return (
    <NotificationBadgeContext.Provider
      value={{
        proposalCount,
        messageCount,
        proposalRequestCount,
        refreshProposalCount,
        refreshMessageCount,
        refreshProposalRequestCount,
        refreshAllCounts,
        clearProposalCount,
        clearMessageCount,
        clearProposalRequestCount,
      }}
    >
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge() {
  const context = useContext(NotificationBadgeContext);
  if (context === undefined) {
    throw new Error('useNotificationBadge must be used within a NotificationBadgeProvider');
  }
  return context;
}