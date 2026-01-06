import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { MessageCircle, MoreVertical, XCircle, Flag } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnread } from '@/contexts/UnreadContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { matchesAPI, type Match as MatchType, type ArchivedMatch } from '@/api/matches';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import { FullScreenLoader } from '@/components/FullScreenLoader';

export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setUnreadCount } = useUnread();
  const { refreshMessageCount } = useNotificationBadge();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [archivedMatches, setArchivedMatches] = useState<ArchivedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatchForMenu, setSelectedMatchForMenu] = useState<MatchType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<MatchType | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Sayfa her açıldığında veri yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Matches screen focused');
      if (user?.id) {
        loadMatches();
        // Matches sayfası açıldığında mesaj sayacını yenile
        refreshMessageCount();
      }
    }, [user?.id])
  );

  useEffect(() => {
    // İlk yükleme
    loadMatches();

    // Real-time mesaj dinleme
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        console.log('New message:', payload);
        loadMatches();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        console.log('Message updated:', payload);
        loadMatches();
      })
      .subscribe();

    // Match değişikliklerini de dinle
    const matchesSubscription = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
        console.log('New match:', payload);
        if (user?.id && (payload.new.user1_id === user.id || payload.new.user2_id === user.id)) {
          // Kullanıcının yeni match'i - direkt yükle
          loadMatches();
        }
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      matchesSubscription.unsubscribe();
    };
  }, [user?.id]);

  const loadMatches = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Aktif ve geçmiş sohbetleri paralel yükle
      const [activeData, archivedData] = await Promise.all([
        matchesAPI.getMatches(user.id),
        matchesAPI.getArchivedMatches(user.id)
      ]);
      
      setMatches(activeData);
      setArchivedMatches(archivedData);
      
      // Kaç kişiden okunmamış mesaj var
      const unreadPeopleCount = activeData.filter(match => (match.unreadCount || 0) > 0).length;
      setUnreadCount(unreadPeopleCount);
    } catch (error: any) {
      setErrorMessage(error.message);
      setShowErrorToast(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}d`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}s`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}g`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete || !user?.id) return;
    
    const matchIdToDelete = matchToDelete.id;
    
    // Modal'ı kapat ve state'i temizle
    setShowDeleteConfirm(false);
    setMatchToDelete(null);
    
    // Önce UI'dan kaldır (instant)
    setMatches(prev => prev.filter(m => m.id !== matchIdToDelete));
    
    // API katmanından soft delete
    try {
      await matchesAPI.deleteMatch(matchIdToDelete, user.id);
    } catch (error: any) {
      console.error('Delete error:', error);
      setErrorMessage('Sohbet sonlandırılamadı: ' + error.message);
      setShowErrorToast(true);
      // Hata olursa geri yükle
      loadMatches();
    }
  };

  const handleReport = () => {
    setSelectedMatchForMenu(null);
    setInfoMessage('Bu özellik yakında eklenecek');
    setShowInfoToast(true);
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Aktif Sohbetler
          </Text>
          {matches.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.tabBadgeTextActive]}>
                {matches.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'archived' && styles.tabActive]}
          onPress={() => setActiveTab('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
            Geçmiş Sohbetler
          </Text>
          {archivedMatches.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'archived' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'archived' && styles.tabBadgeTextActive]}>
                {archivedMatches.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMatches} />
        }
      >
        {activeTab === 'active' ? (
          // Aktif Sohbetler
          matches.length > 0 ? (
            matches.map(match => (
              <View key={match.id} style={styles.matchCardWrapper}>
                <TouchableOpacity
                  style={styles.matchCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/messages/[id]',
                      params: { id: match.id }
                    });
                  }}
                >
                  <Image
                    source={{ uri: match.otherUser?.profile_photo }}
                    style={styles.matchImage}
                  />
                  <View style={styles.matchInfo}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchName}>
                        {match.otherUser?.name}
                      </Text>
                      {(match.unreadCount ?? 0) > 0 && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    <Text style={styles.proposalName} numberOfLines={1}>
                      {match.proposal_name || match.proposal?.activity_name || 'Teklif'}
                    </Text>
                    {match.lastMessage ? (
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {match.lastMessage.content}
                      </Text>
                    ) : (
                      <Text style={styles.lastMessage}>Yeni eşleşme</Text>
                    )}
                  </View>
                  <View style={styles.matchRight}>
                    <Text style={styles.timeText}>
                      {match.lastMessage ? formatTime(match.lastMessage.created_at) : formatTime(match.matched_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={(event) => {
                    event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                      setMenuPosition({ top: pageY + height, right: 16 });
                      setSelectedMatchForMenu(match);
                    });
                  }}
                >
                  <MoreVertical size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MessageCircle size={64} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Mesajınız yok</Text>
              <Text style={styles.emptySubtext}>
                Yeni insanlarla tanışın ve sohbet edin
              </Text>
            </View>
          )
        ) : (
          // Geçmiş Sohbetler
          archivedMatches.length > 0 ? (
            archivedMatches.map(archivedMatch => (
              <TouchableOpacity
                key={archivedMatch.id}
                style={styles.archivedMatchCard}
                activeOpacity={0.7}
                onPress={() => {
                  router.push({
                    pathname: '/messages/[id]',
                    params: { 
                      id: archivedMatch.id,
                      archived: 'true'
                    }
                  });
                }}
              >
                <View style={styles.archivedMatchInfo}>
                  <Text style={styles.archivedMatchName}>
                    {archivedMatch.otherUserName}
                  </Text>
                  <Text style={styles.archivedProposalName}>
                    {archivedMatch.proposalName}
                  </Text>
                  <Text style={styles.archivedMatchDate}>
                    Eşleşme: {formatTime(archivedMatch.matchedAt)}
                  </Text>
                </View>
                <View style={styles.archivedBadge}>
                  <Text style={styles.archivedBadgeText}>Geçmiş</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MessageCircle size={64} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Geçmiş sohbet yok</Text>
              <Text style={styles.emptySubtext}>
                Sonlandırılan sohbetler burada görünecek
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={!!selectedMatchForMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMatchForMenu(null)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMatchForMenu(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.menuPopup, { top: menuPosition.top, right: menuPosition.right }]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMatchToDelete(selectedMatchForMenu);
                setSelectedMatchForMenu(null);
                setTimeout(() => setShowDeleteConfirm(true), 100);
              }}
            >
              <XCircle size={20} color="#FF3B30" strokeWidth={2} />
              <Text style={styles.menuItemTextDanger}>Sohbeti Sonlandır</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReport}
            >
              <Flag size={20} color="#6B7280" strokeWidth={2} />
              <Text style={styles.menuItemText}>Rapor Et</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Sohbeti Sonlandır</Text>
            <Text style={styles.confirmMessage}>
              Bu sohbeti sonlandırmak istediğinize emin misiniz? Tüm mesajlar silinecektir.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmButtonCancel}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButtonDelete}
                onPress={handleDeleteMatch}
              >
                <Text style={styles.confirmButtonDeleteText}>Sonlandır</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />

      {/* Info Toast */}
      <InfoToast
        visible={showInfoToast}
        message={infoMessage}
        onHide={() => setShowInfoToast(false)}
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
  content: {
    flex: 1,
  },
  matchCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matchCard: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  matchImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  proposalName: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  matchRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuPopup: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemTextDanger: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 32,
    overflow: 'hidden',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  confirmButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonDelete: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
  },
  confirmButtonDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Tab Styles
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginHorizontal: 4,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  tabBadgeTextActive: {
    color: '#FFF',
  },
  // Archived Match Styles
  archivedMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  archivedMatchInfo: {
    flex: 1,
  },
  archivedMatchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  archivedProposalName: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 2,
  },
  archivedMatchDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  archivedBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  archivedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
});
