import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Send, X as XIcon, User, XCircle } from 'lucide-react-native';
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

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { setUnreadCount } = useUnread();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadMatches();

    // Real-time mesaj dinleme
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (selectedMatch) {
          loadMessages(selectedMatch.id);
        }
        loadMatches(); // Badge güncellemesi için
      })
      .subscribe();

    // Real-time eşleşme dinleme
    const matchesSubscription = supabase
      .channel('matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadMatches();
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      matchesSubscription.unsubscribe();
    };
  }, [selectedMatch]);

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

  const loadMessages = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('match_id', matchId)
        .neq('sender_id', user?.id);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedMatch || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from('messages').insert({
        match_id: selectedMatch.id,
        sender_id: user?.id,
        content: messageText.trim(),
      });

      if (error) throw error;

      setMessageText('');
      loadMessages(selectedMatch.id);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setSendingMessage(false);
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
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;
    return (
      <View style={[styles.messageWrapper, isOwn && styles.messageWrapperOwn]}>
        {!isOwn && selectedMatch && (
          <Image
            source={{ uri: selectedMatch.otherUser?.profile_photo }}
            style={styles.messageAvatar}
          />
        )}
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
              {formatTime(item.created_at)}
            </Text>
            {isOwn && item.read && (
              <Text style={styles.readIndicator}>✓✓</Text>
            )}
          </View>
        </View>
        {isOwn && <View style={styles.avatarSpacer} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.header}>
        <Text style={styles.headerTitle}>Eşleşmeler</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMatches} />
        }
      >
        {matches.length > 0 ? (
          matches.map(match => (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCard}
              onPress={() => {
                setSelectedMatch(match);
                loadMessages(match.id);
              }}
            >
              <Image
                source={{ uri: match.otherUser?.profile_photo }}
                style={styles.matchImage}
              />
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>
                  {match.otherUser?.name}, {calculateAge(match.otherUser?.birth_date || '')}
                </Text>
                <Text style={styles.matchActivity}>{match.proposal.activity_name}</Text>
                {match.lastMessage && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {match.lastMessage.content}
                  </Text>
                )}
              </View>
              <View style={styles.matchIconContainer}>
                <MessageCircle size={24} color="#8B5CF6" />
                {match.unreadCount && match.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {match.unreadCount > 9 ? '9+' : match.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Henüz eşleşme yok</Text>
            <Text style={styles.emptySubtext}>
              Teklifleri keşfedin ve eşleşmeye başlayın
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedMatch}
        animationType="slide"
        onRequestClose={() => setSelectedMatch(null)}
      >
        {selectedMatch && (
          <View style={styles.chatContainer}>
            <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.chatHeader}>
              <View style={styles.chatHeaderContent}>
                <TouchableOpacity onPress={() => setSelectedMatch(null)} style={styles.chatCloseButton}>
                  <XIcon size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatHeaderInfo}
                  onPress={() => setShowOptionsModal(true)}
                >
                  <Image
                    source={{ uri: selectedMatch.otherUser?.profile_photo }}
                    style={styles.chatHeaderImage}
                  />
                  <View>
                    <Text style={styles.chatHeaderName}>
                      {selectedMatch.otherUser?.name}
                    </Text>
                    <Text style={styles.chatHeaderActivity}>
                      {selectedMatch.proposal.activity_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesContainer}
              style={styles.messagesList}
            />

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
              style={styles.inputWrapper}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Mesaj yaz..."
                  placeholderTextColor="#9CA3AF"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!messageText.trim() || sendingMessage}
                >
                  <Send size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seçenekler</Text>
            </View>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowOptionsModal(false);
                setShowDeleteConfirm(true);
              }}
            >
              <XCircle size={22} color="#EF4444" />
              <Text style={styles.modalOptionTextDanger}>Sohbeti Sonlandır</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOptionCancel}
              onPress={() => setShowOptionsModal(false)}
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
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDeleteConfirm(false)}
          />
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Sohbeti Sonlandır</Text>
              <Text style={styles.confirmModalMessage}>
                Bu sohbeti sonlandırmak istediğinize emin misiniz? Tüm mesajlar silinecektir.
              </Text>
            </View>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalButtonCancel}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmModalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalButtonDelete}
                onPress={async () => {
                  try {
                    if (selectedMatch) {
                      await supabase
                        .from('matches')
                        .delete()
                        .eq('id', selectedMatch.id);
                      setShowDeleteConfirm(false);
                      setSelectedMatch(null);
                      loadMatches();
                    }
                  } catch (error: any) {
                    Alert.alert('Hata', error.message);
                  }
                }}
              >
                <Text style={styles.confirmModalButtonDeleteText}>Sonlandır</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  matchInfo: {
    flex: 1,
    marginLeft: 16,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  matchActivity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  matchIconContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  chatHeader: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  chatHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  chatCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatHeaderImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  chatHeaderActivity: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  messagesContainer: {
    padding: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  messageWrapperOwn: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 2,
  },
  avatarSpacer: {
    width: 32,
    marginLeft: 8,
  },
  messageBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  messageBubbleOwn: {
    backgroundColor: '#8B5CF6',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIndicator: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  inputWrapper: {
    backgroundColor: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#8B5CF6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  modalOptionTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOptionCancel: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 8,
  },
  modalOptionCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  confirmModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  confirmModalHeader: {
    padding: 24,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmModalButtonCancel: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  confirmModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmModalButtonDelete: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  confirmModalButtonDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
});
