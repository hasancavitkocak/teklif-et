import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';

import { Clock, Check, X as XIcon, Zap, Trash2, UserPlus, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnread } from '@/contexts/UnreadContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { proposalsAPI, type Proposal, type ProposalRequest } from '@/api/proposals';
import { invitationsAPI } from '@/api/invitations';
import InviteUsersModal from '@/components/InviteUsersModal';
import InvitationsList from '@/components/InvitationsList';
import ProposalSwipeCards from '@/components/ProposalSwipeCards';
import ProposalDeletedToast from '@/components/ProposalDeletedToast';
import ProposalDeleteConfirmModal from '@/components/ProposalDeleteConfirmModal';
import ErrorToast from '@/components/ErrorToast';
import MatchSuccessModal from '@/components/MatchSuccessModal';

export default function ProposalsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setProposalsCount } = useUnread();
  const [activeTab, setActiveTab] = useState<'my_proposals' | 'received' | 'sent' | 'invitations'>('my_proposals');
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [received, setReceived] = useState<ProposalRequest[]>([]);
  const [sent, setSent] = useState<ProposalRequest[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [displayedInvitations, setDisplayedInvitations] = useState<any[]>([]);
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [hasMoreInvitations, setHasMoreInvitations] = useState(true);
  const [displayedRequests, setDisplayedRequests] = useState<ProposalRequest[]>([]);
  const [requestsPage, setRequestsPage] = useState(1);
  const [hasMoreRequests, setHasMoreRequests] = useState(true);
  const INVITATIONS_PER_PAGE = 20; // 20 ile sınırla
  const REQUESTS_PER_PAGE = 20; // 20 ile sınırla
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sentSubTab, setSentSubTab] = useState<'invitations' | 'requests'>('invitations');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{
    id: string;
    name: string;
    city: string;
    interestId: string;
  } | null>(null);
  const [showDeletedToast, setShowDeletedToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMatchSuccessModal, setShowMatchSuccessModal] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState('');

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
      // Tab değiştiğinde pagination'ı sıfırla
      if (activeTab === 'sent') {
        resetInvitationsPagination();
        resetRequestsPagination();
      }
      loadTabData();
    }
  }, [activeTab]);

  const loadProposals = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // API katmanından veri al - Pagination için sadece ilk sayfa
      const [myProposalsData, receivedData, pendingCount] = await Promise.all([
        proposalsAPI.getMyProposals(user.id),
        proposalsAPI.getReceivedRequests(user.id),
        proposalsAPI.getPendingCount(user.id),
      ]);

      setMyProposals(myProposalsData);
      setReceived(receivedData);
      setProposalsCount(pendingCount);
      
      // Sent tab için pagination başlat
      if (activeTab === 'sent') {
        await updateDisplayedInvitations(1);
        await updateDisplayedRequests(1);
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Davetler pagination fonksiyonları - Sadece son 20 davet
  const updateDisplayedInvitations = async (page: number) => {
    if (!user?.id) return;
    
    try {
      // Sadece ilk 20 daveti çek
      const newInvitations = await invitationsAPI.getSentInvitations(user.id, INVITATIONS_PER_PAGE, 0);
      
      setDisplayedInvitations(newInvitations);
      setInvitationsPage(1);
      setHasMoreInvitations(false); // Daha fazla yükleme yok
      
      console.log(`📄 Davetler yüklendi: ${newInvitations.length} adet (son 20)`);
    } catch (error) {
      console.error('Davetler yükleme hatası:', error);
    }
  };

  const loadMoreInvitations = () => {
    // Artık kullanılmıyor - 20 ile sınırlı
    return;
  };

  const resetInvitationsPagination = () => {
    setInvitationsPage(1);
    setDisplayedInvitations([]);
    setHasMoreInvitations(false);
  };

  // İstekler pagination fonksiyonları - Sadece son 20 istek
  const updateDisplayedRequests = async (page: number) => {
    if (!user?.id) return;
    
    try {
      // Sadece ilk 20 isteği çek
      const newRequests = await proposalsAPI.getSentRequests(user.id, REQUESTS_PER_PAGE, 0);
      
      setDisplayedRequests(newRequests);
      setRequestsPage(1);
      setHasMoreRequests(false); // Daha fazla yükleme yok
      
      console.log(`📄 İstekler yüklendi: ${newRequests.length} adet (son 20)`);
    } catch (error) {
      console.error('İstekler yükleme hatası:', error);
    }
  };

  const loadMoreRequests = () => {
    // Artık kullanılmıyor - 20 ile sınırlı
    return;
  };

  const resetRequestsPagination = () => {
    setRequestsPage(1);
    setDisplayedRequests([]);
    setHasMoreRequests(false);
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
        // Pagination ile veri yükle
        await updateDisplayedInvitations(1);
        await updateDisplayedRequests(1);
      }
    } catch (error: any) {
      console.error('Tab data load error:', error);
    }
  };

  const handleAccept = async (requestId: string, proposalId: string, requesterId: string) => {
    if (!user?.id) return;

    try {
      await proposalsAPI.acceptRequest(requestId, proposalId, requesterId, user.id);

      // Eşleşme başarılı - kullanıcı adını al ve modal göster
      const matchedUser = received.find(r => r.id === requestId)?.requester;
      if (matchedUser) {
        setMatchedUserName(matchedUser.name);
        setShowMatchSuccessModal(true);
      }
      loadProposals();
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await proposalsAPI.rejectRequest(requestId);
      loadProposals();
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    }
  };

  const handleDeleteProposal = (proposalId: string) => {
    setProposalToDelete(proposalId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;

    setDeleteLoading(true);
    try {
      await proposalsAPI.deleteProposal(proposalToDelete);
      setShowDeleteConfirm(false);
      setShowDeletedToast(true);
      loadProposals();
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    } finally {
      setDeleteLoading(false);
      setProposalToDelete(null);
    }
  };

  const handleInviteUsers = async (proposal: Proposal) => {
    // Kullanıcının güncel konumunu al (profil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user?.id)
      .single();

    setSelectedProposal({
      id: proposal.id,
      name: proposal.activity_name,
      city: profile?.city || proposal.city, // Profil konumu öncelikli
      interestId: proposal.interest.id || '',
    });
    setInviteModalVisible(true);
  };

  const handleCloseInviteModal = () => {
    setInviteModalVisible(false);
    setSelectedProposal(null);
    // Davet gönderildikten sonra proposals listesini yenile
    loadTabData();
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

  const renderInvitation = (invitation: any) => {
    const statusColor =
      invitation.status === 'accepted'
        ? '#10B981'
        : invitation.status === 'declined'
        ? '#EF4444'
        : '#F59E0B';

    const statusText =
      invitation.status === 'pending'
        ? '📤 Gönderildi'
        : invitation.status === 'accepted'
        ? '✓ Kabul Edildi'
        : '✗ Reddedildi';

    return (
      <TouchableOpacity 
        key={invitation.id} 
        style={styles.requestCard}
        onPress={() => invitation.invited_user_id && router.push(`/profile/${invitation.invited_user_id}` as any)}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: invitation.invited_user?.profile_photo || 'https://via.placeholder.com/90' }} 
          style={styles.requestImage} 
        />
        <View style={styles.requestInfo}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestName}>
              {invitation.invited_user?.name || 'Kullanıcı'}, {calculateAge(invitation.invited_user?.birth_date || '2000-01-01')}
            </Text>
          </View>
          <Text style={styles.requestActivity}>{invitation.proposal?.activity_name || 'Teklif'}</Text>
          <Text style={styles.requestCity}>{invitation.proposal?.city || ''}</Text>
          <Text style={[styles.requestStatus, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
        {invitation.status === 'accepted' && (
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: '#D1FAE5',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
          }}>
            <Check size={16} color="#10B981" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderRequest = (request: ProposalRequest, type: 'received' | 'sent') => {
    const profile = type === 'received' ? request.requester : request.proposal.creator;
    const statusColor =
      request.status === 'accepted'
        ? '#10B981'
        : request.status === 'rejected'
        ? '#EF4444'
        : request.status === 'auto_rejected'
        ? '#9CA3AF'
        : '#F59E0B';

    const statusText =
      request.status === 'pending'
        ? 'Beklemede'
        : request.status === 'accepted'
        ? '✓ Kabul Edildi'
        : request.status === 'rejected'
        ? '✗ Reddedildi'
        : request.status === 'auto_rejected'
        ? 'Başka Biri Kabul Edildi'
        : 'Beklemede';

    // Profil ID'sini doğru belirle: received'da requester, sent'te proposal creator
    const userId = type === 'received' ? request.requester_id : request.proposal.creator.id;

    return (
      <TouchableOpacity 
        key={request.id} 
        style={styles.requestCard}
        onPress={() => userId && router.push(`/profile/${userId}` as any)}
        activeOpacity={0.7}
      >
        {/* Süper Beğeni Badge - Üstte */}
        {request.is_super_like && (
          <View style={styles.superLikeBadgeTop}>
            <Zap size={14} color="#FFF" fill="#FFF" />
            <Text style={styles.superLikeBadgeText}>Süper Beğeni</Text>
          </View>
        )}
        
        <Image source={{ uri: profile.profile_photo }} style={styles.requestImage} />
        <View style={styles.requestInfo}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestName}>
              {profile.name}, {calculateAge(profile.birth_date)}
            </Text>
          </View>
          <Text style={styles.requestActivity}>{request.proposal.activity_name}</Text>
          <Text style={styles.requestCity}>{request.proposal.city}</Text>
          <Text style={[styles.requestStatus, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
        {type === 'received' && request.status === 'pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleReject(request.id);
              }}
            >
              <XIcon size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAccept(request.id, request.proposal.id, request.requester_id);
              }}
            >
              <Check size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        {request.status === 'accepted' && (
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: '#D1FAE5',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
          }}>
            <Check size={16} color="#10B981" />
          </View>
        )}
      </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invitations' && styles.tabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Text style={[styles.tabText, activeTab === 'invitations' && styles.tabTextActive]}>
            Davetler
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my_proposals' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadProposals} />
          }
        >
          {myProposals.length > 0 ? (
            myProposals.map(proposal => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proposalTitle}>{proposal.activity_name}</Text>
                  </View>
                  <View style={styles.proposalActions}>
                    {(proposal.requests_count ?? 0) > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{proposal.requests_count}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleInviteUsers(proposal)}
                      style={[
                        styles.inviteButton,
                        proposal.event_datetime && new Date(proposal.event_datetime) < new Date() && styles.inviteButtonDisabled
                      ]}
                      disabled={!!(proposal.event_datetime && new Date(proposal.event_datetime) < new Date())}
                    >
                      <UserPlus 
                        size={18} 
                        color={proposal.event_datetime && new Date(proposal.event_datetime) < new Date() ? "#9CA3AF" : "#8B5CF6"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteProposal(proposal.id)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                {proposal.interest && (
                  <Text style={styles.proposalCategory}>{proposal.interest.name}</Text>
                )}
                {proposal.description && (
                  <Text style={styles.proposalDescription}>{proposal.description}</Text>
                )}
                <View style={styles.proposalDetails}>
                  {proposal.location_name && (
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#8B5CF6" />
                      <Text style={styles.proposalDetail}>{proposal.location_name}</Text>
                    </View>
                  )}
                  <View style={styles.locationRow}>
                    <MapPin size={14} color="#8B5CF6" />
                    <Text style={styles.proposalDetail}>{proposal.city}</Text>
                  </View>
                </View>
                
                {/* Oluşturma Tarihi */}
                <View style={styles.dateContainer}>
                  <Text style={styles.dateLabel}>Oluşturma tarihi:</Text>
                  <Text style={styles.dateValue}>
                    {new Date(proposal.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} {new Date(proposal.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                {/* Etkinlik Tarihi */}
                {proposal.event_datetime && (
                  <View>
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateLabel}>Etkinlik tarihi:</Text>
                      <Text style={[
                        styles.dateValue,
                        new Date(proposal.event_datetime) < new Date() && styles.expiredDate
                      ]}>
                        {new Date(proposal.event_datetime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} - {new Date(proposal.event_datetime).toLocaleDateString('tr-TR', {
                          weekday: 'long'
                        })}
                      </Text>
                    </View>
                    {/* Geçmiş tarih uyarısı - Tarihin altında */}
                    {new Date(proposal.event_datetime) < new Date() && (
                      <View style={styles.expiredWarning}>
                        <XIcon size={16} color="#EF4444" />
                        <Text style={styles.expiredText}>Bu etkinlik tarihi geçmiş</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Clock size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Henüz teklif oluşturmadınız</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Başvurular Tab - Swipe Cards */}
      {activeTab === 'received' && (
        <ProposalSwipeCards
          requests={received.filter(r => r.status === 'pending')}
          onAccept={handleAccept}
          onReject={handleReject}
          onEmpty={() => loadTabData()}
        />
      )}

      {activeTab === 'sent' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadProposals} />
          }
        >
          <>
            {/* Alt Tab'lar */}
            <View style={styles.subTabsContainer}>
              <TouchableOpacity
                style={[styles.subTab, sentSubTab === 'invitations' && styles.subTabActive]}
                onPress={() => setSentSubTab('invitations')}
              >
                <Text style={[styles.subTabText, sentSubTab === 'invitations' && styles.subTabTextActive]}>
                  Davetler
                </Text>
                {displayedInvitations.length > 0 && (
                  <View style={[
                    styles.subTabBadge,
                    sentSubTab === 'invitations' && styles.subTabBadgeActive
                  ]}>
                    <Text style={[
                      styles.subTabBadgeText,
                      sentSubTab === 'invitations' && styles.subTabBadgeTextActive
                    ]}>
                      {displayedInvitations.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, sentSubTab === 'requests' && styles.subTabActive]}
                onPress={() => setSentSubTab('requests')}
              >
                <Text style={[styles.subTabText, sentSubTab === 'requests' && styles.subTabTextActive]}>
                  İstekler
                </Text>
                {displayedRequests.length > 0 && (
                  <View style={[
                    styles.subTabBadge,
                    sentSubTab === 'requests' && styles.subTabBadgeActive
                  ]}>
                    <Text style={[
                      styles.subTabBadgeText,
                      sentSubTab === 'requests' && styles.subTabBadgeTextActive
                    ]}>
                      {displayedRequests.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* İçerik */}
            {sentSubTab === 'invitations' ? (
              <>
                {displayedInvitations.length > 0 ? (
                  <>
                    {displayedInvitations.map(invitation => renderInvitation(invitation))}
                    
                    {/* Son 20 Davet Mesajı */}
                    <View style={styles.endMessageContainer}>
                      <Text style={styles.endMessageText}>
                        Son 20 davet gösteriliyor ({displayedInvitations.length})
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Clock size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Henüz gönderilen davet yok</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {displayedRequests.length > 0 ? (
                  <>
                    {displayedRequests.map(request => renderRequest(request, 'sent'))}
                    
                    {/* Son 20 İstek Mesajı */}
                    <View style={styles.endMessageContainer}>
                      <Text style={styles.endMessageText}>
                        Son 20 istek gösteriliyor ({displayedRequests.length})
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Clock size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Henüz gönderilen istek yok</Text>
                  </View>
                )}
              </>
            )}
          </>
        </ScrollView>
      )}

      {activeTab === 'invitations' && <InvitationsList />}

      {/* Invite Users Modal */}
      {selectedProposal && (
        <InviteUsersModal
          visible={inviteModalVisible}
          onClose={handleCloseInviteModal}
          proposalId={selectedProposal.id}
          proposalName={selectedProposal.name}
          proposalCity={selectedProposal.city}
          proposalInterestId={selectedProposal.interestId}
          onInviteSent={loadTabData}
        />
      )}

      {/* Proposal Delete Confirm Modal */}
      <ProposalDeleteConfirmModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setProposalToDelete(null);
        }}
        onConfirm={confirmDeleteProposal}
        loading={deleteLoading}
      />

      {/* Proposal Deleted Toast */}
      <ProposalDeletedToast
        visible={showDeletedToast}
        onHide={() => setShowDeletedToast(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />

      {/* Match Success Modal */}
      <MatchSuccessModal
        visible={showMatchSuccessModal}
        onClose={() => setShowMatchSuccessModal(false)}
        userName={matchedUserName}
        onMessage={() => {
          setShowMatchSuccessModal(false);
          router.push('/(tabs)/matches');
        }}
      />
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
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100, // Tab bar için extra space
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeRequest: {
    backgroundColor: '#6366F1',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
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
  superLikeBadgeTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  superLikeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
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
  inviteButton: {
    padding: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.5,
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#8B5CF6',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  subTabTextActive: {
    color: '#FFF',
  },
  subTabBadge: {
    backgroundColor: '#E5E7EB',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  subTabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  subTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  subTabBadgeTextActive: {
    color: '#FFF',
  },
  loadMoreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  endMessageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endMessageText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Geçmiş tarih stilleri
  expiredDate: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  expiredWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 16, // Tarih label'ı ile hizalamak için
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignSelf: 'flex-start', // Sol tarafa hizala
  },
  expiredText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
});

