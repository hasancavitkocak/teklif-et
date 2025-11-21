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
  Modal,
} from 'react-native';
import { MessageCircle, MoreVertical, XCircle, Flag } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnread } from '@/contexts/UnreadContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
  proposal: {
    activity_name: string;
  };
  otherUser: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unreadCount?: number;
}



export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setUnreadCount } = useUnread();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatchForMenu, setSelectedMatchForMenu] = useState<Match | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadMatches();

    // Real-time mesaj dinleme
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadMatches();
      })
      .subscribe();

    // Real-time eşleşme dinleme
    const matchesSubscription = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadMatches();
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      matchesSubscription.unsubscribe();
    };
  }, []);

  const loadMatches = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          matched_at,
          proposal:proposals(activity_name)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      const matchesWithUsers = await Promise.all(
        (data || []).map(async match => {
          const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;

          const { data: otherUser } = await supabase
            .from('profiles')
            .select('name, profile_photo, birth_date')
            .eq('id', otherUserId)
            .single();

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Okunmamış mesaj sayısı
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .eq('read', false)
            .neq('sender_id', user.id);

          return {
            ...match,
            otherUser,
            lastMessage: lastMsg,
            unreadCount: unreadCount || 0,
          };
        })
      );

      setMatches(matchesWithUsers as any);
      
      // Kaç kişiden okunmamış mesaj var (kişi bazında)
      const unreadPeopleCount = matchesWithUsers.filter(match => (match.unreadCount || 0) > 0).length;
      setUnreadCount(unreadPeopleCount);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
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
    if (!selectedMatchForMenu) return;
    
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', selectedMatchForMenu.id);
      
      if (error) throw error;
      
      setShowDeleteConfirm(false);
      setSelectedMatchForMenu(null);
      loadMatches();
    } catch (error: any) {
      console.error('Delete error:', error);
      Alert.alert('Hata', error.message);
    }
  };

  const handleReport = () => {
    setSelectedMatchForMenu(null);
    Alert.alert('Rapor Et', 'Bu özellik yakında eklenecek');
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
      </View>

      {/* Matches List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMatches} />
        }
      >
        {matches.length > 0 ? (
          matches.map(match => (
            <View key={match.id} style={styles.matchCardWrapper}>
              <TouchableOpacity
                style={styles.matchCard}
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
                onPress={() => setSelectedMatchForMenu(match)}
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMatchForMenu(null)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setSelectedMatchForMenu(null);
                setShowDeleteConfirm(true);
              }}
            >
              <XCircle size={22} color="#FF3B30" />
              <Text style={styles.modalOptionTextDanger}>Sohbeti Sonlandır</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleReport}
            >
              <Flag size={22} color="#8E8E93" />
              <Text style={styles.modalOptionText}>Rapor Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOptionCancel}
              onPress={() => setSelectedMatchForMenu(null)}
            >
              <Text style={styles.modalOptionCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
  modalOptionTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalOptionCancel: {
    padding: 16,
    alignItems: 'center',
  },
  modalOptionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmModal: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginHorizontal: 40,
    overflow: 'hidden',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 18,
  },
  confirmButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  confirmButtonCancel: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  confirmButtonCancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  confirmButtonDelete: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  confirmButtonDeleteText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
