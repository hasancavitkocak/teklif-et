import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';

import { Clock, Check, X as XIcon, Zap, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnread } from '@/contexts/UnreadContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { proposalsAPI, type Proposal, type ProposalRequest } from '@/api/proposals';

export default function ProposalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setProposalsCount } = useUnread();
  const [activeTab, setActiveTab] = useState<'my_proposals' | 'received' | 'sent'>('my_proposals');
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [received, setReceived] = useState<ProposalRequest[]>([]);
  const [sent, setSent] = useState<ProposalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sayfa her açıldığında veri yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Proposals screen focused');
      if (user?.id) {
        loadTabData();
      }
    }, [activeTab, user?.id])
  );

  useEffect(() => {
    loadProposals();

    // Real-time başvuru dinleme
    const subscription = supabase
      .channel('proposal-requests-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'proposal_requests' 
      }, (payload) => {
        console.log('Proposal request change:', payload);
        // Sadece ilgili tab'ı güncelle
        if (user?.id) {
          if (payload.eventType === 'INSERT' && payload.new.requester_id === user.id) {
            // Kullanıcı başvuru yaptı - sent tab'ı güncelle
            if (activeTab === 'sent') {
              loadTabData();
            }
          } else {
            // Başka değişiklikler - tüm veriyi yükle
            loadProposals();
          }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'proposals' 
      }, (payload) => {
        console.log('New proposal created:', payload);
        // Yeni teklif oluşturulduğunda otomatik yükle
        if (user?.id && payload.new.creator_id === user.id) {
          // Kullanıcının kendi teklifi - my_proposals tab'ı güncelle
          if (activeTab === 'my_proposals') {
            loadTabData();
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab, user?.id]);

  // Tab değiştiğinde otomatik veri yükle
  useEffect(() => {
    if (user?.id) {
      console.log('Tab changed to:', activeTab);
      loadTabData();
    }
  }, [activeTab]);

  const loadProposals = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // API katmanından veri al
      const [myProposalsData, receivedData, sentData, pendingCount] = await Promise.all([
        proposalsAPI.getMyProposals(user.id),
        proposalsAPI.getReceivedRequests(user.id),
        proposalsAPI.getSentRequests(user.id),
        proposalsAPI.getPendingCount(user.id),
      ]);

      setMyProposals(myProposalsData);
      setReceived(receivedData);
      setSent(sentData);
      setProposalsCount(pendingCount);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tab değiştiğinde sadece o tab'ın verisini yükle
  const loadTabData = async () => {
    if (!user?.id) return;

    try {
      if (activeTab === 'my_proposals') {
        const data = await proposalsAPI.getMyProposals(user.id);
        setMyProposals(data);
      } else if (activeTab === 'received') {
        const [receivedData, pendingCount] = await Promise.all([
          proposalsAPI.getReceivedRequests(user.id),
          proposalsAPI.getPendingCount(user.id),
        ]);
        setReceived(receivedData);
        setProposalsCount(pendingCount);
      } else if (activeTab === 'sent') {
        const data = await proposalsAPI.getSentRequests(user.id);
        setSent(data);
      }
    } catch (error: any) {
      console.error('Tab data load error:', error);
    }
  };

  const handleAccept = async (requestId: string, proposalId: string, requesterId: string) => {
    if (!user?.id) return;

    try {
      await proposalsAPI.acceptRequest(requestId, proposalId, requesterId, user.id);

      Alert.alert(
        'Başarılı',
        'Teklif kabul edildi! Artık mesajlaşabilirsiniz.',
        [
          {
            text: 'Mesajlaşmaya Başla',
            onPress: () => router.push('/(tabs)/matches'),
          },
          {
            text: 'Tamam',
            onPress: () => loadProposals(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await proposalsAPI.rejectRequest(requestId);
      loadProposals();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    Alert.alert(
      'Teklifi Sil',
      'Bu teklifi silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await proposalsAPI.deleteProposal(proposalId);
              Alert.alert('Başarılı', 'Teklif silindi');
              loadProposals();
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const renderRequest = (request: ProposalRequest, type: 'received' | 'sent') => {
    const profile = type === 'received' ? request.requester : request.proposal.creator;
    const statusColor =
      request.status === 'accepted'
        ? '#10B981'
        : request.status === 'rejected'
        ? '#EF4444'
        : '#F59E0B';

    return (
      <View key={request.id} style={styles.requestCard}>
        <Image source={{ uri: profile.profile_photo }} style={styles.requestImage} />
        <View style={styles.requestInfo}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestName}>
              {profile.name}, {calculateAge(profile.birth_date)}
            </Text>
            {request.is_super_like && (
              <View style={styles.superLikeBadge}>
                <Zap size={12} color="#FFF" fill="#FFF" />
              </View>
            )}
          </View>
          <Text style={styles.requestActivity}>{request.proposal.activity_name}</Text>
          <Text style={styles.requestCity}>{request.proposal.city}</Text>
          <Text style={[styles.requestStatus, { color: statusColor }]}>
            {request.status === 'pending'
              ? 'Beklemede'
              : request.status === 'accepted'
              ? 'Kabul Edildi'
              : 'Reddedildi'}
          </Text>
        </View>
        {type === 'received' && request.status === 'pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(request.id)}
            >
              <XIcon size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() =>
                handleAccept(request.id, request.proposal.id, request.requester_id)
              }
            >
              <Check size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teklifler</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_proposals' && styles.tabActive]}
          onPress={() => setActiveTab('my_proposals')}
        >
          <Text style={[styles.tabText, activeTab === 'my_proposals' && styles.tabTextActive]}>
            Tekliflerim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            Başvurular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            Gönderilen
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadProposals} />
        }
      >
        {activeTab === 'my_proposals' ? (
          myProposals.length > 0 ? (
            myProposals.map(proposal => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proposalTitle}>{proposal.activity_name}</Text>
                  </View>
                  <View style={styles.proposalActions}>
                    {proposal.requests_count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{proposal.requests_count}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteProposal(proposal.id)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.proposalCategory}>{proposal.interest.name}</Text>
                {proposal.description && (
                  <Text style={styles.proposalDescription}>{proposal.description}</Text>
                )}
                <View style={styles.proposalDetails}>
                  {proposal.location_name && (
                    <Text style={styles.proposalDetail}>📍 {proposal.location_name}</Text>
                  )}
                  <Text style={styles.proposalDetail}>
                    👥 {proposal.participant_count} kişi
                    {proposal.is_group && ' (Grup)'}
                  </Text>
                  <Text style={styles.proposalDetail}>📍 {proposal.city}</Text>
                </View>
                <Text style={styles.proposalDate}>
                  {new Date(proposal.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Clock size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Henüz teklif oluşturmadınız</Text>
            </View>
          )
        ) : activeTab === 'received' ? (
          received.length > 0 ? (
            received.map(request => renderRequest(request, 'received'))
          ) : (
            <View style={styles.emptyContainer}>
              <Clock size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Henüz başvuru yok</Text>
            </View>
          )
        ) : sent.length > 0 ? (
          sent.map(request => renderRequest(request, 'sent'))
        ) : (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Henüz gönderilen başvuru yok</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: 12,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  requestImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requestName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  superLikeBadge: {
    backgroundColor: '#F59E0B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestActivity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 2,
  },
  requestCity: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  requestStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  rejectButton: {
    width: 44,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButton: {
    width: 44,
    height: 44,
    backgroundColor: '#10B981',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  proposalCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  proposalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  badge: {
    backgroundColor: '#8B5CF6',
    minWidth: 28,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  proposalCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 6,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  proposalDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  proposalDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  proposalDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
