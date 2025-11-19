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
  }, []);

  const loadMatches = async () => {
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
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
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

          return {
            ...match,
            otherUser,
            lastMessage: lastMsg,
          };
        })
      );

      setMatches(matchesWithUsers as any);
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
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
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
              <MessageCircle size={24} color="#8B5CF6" />
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(false)}
        >
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
        </TouchableOpacity>
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
    paddingTop: 60,
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
    paddingTop: 60,
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
    backgroundColor: '#F9FAFB',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  messageWrapperOwn: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: '75%',
  },
  messageBubbleOwn: {
    backgroundColor: '#8B5CF6',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.8)',
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
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#1F2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#8B5CF6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 'auto',
    marginTop: 'auto',
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
