import { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Check, X as XIcon, Zap, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnread } from '@/contexts/UnreadContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface ProposalRequest {
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

interface MyProposal {
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
  requests_count: number;
}

export default function ProposalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setProposalsCount } = useUnread();
  const [activeTab, setActiveTab] = useState<'my_proposals' | 'received' | 'sent'>('my_proposals');
  const [myProposals, setMyProposals] = useState<MyProposal[]>([]);
  const [received, setReceived] = useState<ProposalRequest[]>([]);
  const [sent, setSent] = useState<ProposalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      // Load user's own proposals
      const { data: myProposalsData } = await supabase
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
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      // Get request counts for each proposal
      if (myProposalsData) {
        const proposalsWithCounts = await Promise.all(
          myProposalsData.map(async (proposal: any) => {
            const { count } = await supabase
              .from('proposal_requests')
              .select('*', { count: 'exact', head: true })
              .eq('proposal_id', proposal.id)
              .eq('status', 'pending');
            return { ...proposal, requests_count: count || 0 };
          })
        );
        setMyProposals(proposalsWithCounts as any);
      }

      // Load received requests for user's proposals
      const { data: userProposals } = await supabase
        .from('proposals')
        .select('id')
        .eq('creator_id', user?.id);

      const proposalIds = userProposals?.map(p => p.id) || [];

      const { data: receivedData } = await supabase
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
            creator:profiles!creator_id(name, profile_photo, birth_date)
          ),
          requester:profiles!requester_id(name, profile_photo, birth_date)
        `)
        .in('proposal_id', proposalIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setReceived(receivedData as any || []);
      
      // Bekleyen başvuru sayısını hesapla
      const pendingCount = (receivedData || []).filter((r: any) => r.status === 'pending').length;
      setProposalsCount(pendingCount);

      // Load sent requests (user's requests to other proposals)
      const { data: sentData } = await supabase
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
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      setSent(sentData as any || []);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (requestId: string, proposalId: string, requesterId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('proposal_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const user1 = user?.id! < requesterId ? user?.id! : requesterId;
      const user2 = user?.id! < requesterId ? requesterId : user?.id!;

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          proposal_id: proposalId,
          user1_id: user1,
          user2_id: user2,
        })
        .select()
        .single();

      if (matchError) throw matchError;

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
      const { error } = await supabase
        .from('proposal_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
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
              const { error } = await supabase
                .from('proposals')
                .delete()
                .eq('id', proposalId);

              if (error) throw error;
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
      <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.header}>
        <Text style={styles.headerTitle}>Teklifler</Text>
      </LinearGradient>

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
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  proposalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  proposalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    backgroundColor: '#8B5CF6',
    minWidth: 32,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  proposalCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    backgroundColor: '#F3E8FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  proposalDetails: {
    gap: 6,
    marginBottom: 12,
  },
  proposalDetail: {
    fontSize: 14,
    color: '#4B5563',
  },
  proposalDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
