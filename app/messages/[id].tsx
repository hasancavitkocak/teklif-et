import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, XCircle, Flag } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface MatchInfo {
  id: string;
  otherUser: {
    name: string;
    profile_photo: string;
  };
  activity: string;
}

export default function MessageDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!matchId) return;
    
    loadMatchInfo();
    loadMessages();

    // Real-time mesaj dinleme
    const subscription = supabase
      .channel(`messages-${matchId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    // Klavye listeners
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      subscription.unsubscribe();
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [matchId]);

  const loadMatchInfo = async () => {
    try {
      const { data: match, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, proposal:proposals(activity_name)')
        .eq('id', matchId)
        .single();

      if (error) throw error;

      const otherUserId = match.user1_id === user?.id ? match.user2_id : match.user1_id;

      const { data: otherUser } = await supabase
        .from('profiles')
        .select('name, profile_photo')
        .eq('id', otherUserId)
        .single();

      setMatchInfo({
        id: match.id,
        otherUser: otherUser || { name: '', profile_photo: '' },
        activity: (match.proposal as any)?.activity_name || '',
      });
    } catch (error) {
      console.error('Match info error:', error);
    }
  };

  const handleDeleteMatch = async () => {
    console.log('Delete match called, matchId:', matchId);
    
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Match deleted successfully');
      setShowDeleteConfirm(false);
      
      // Biraz bekle sonra geri dön
      setTimeout(() => {
        router.back();
      }, 300);
    } catch (error: any) {
      console.error('Delete error:', error);
      Alert.alert('Hata', error.message || 'Sohbet sonlandırılamadı');
      setShowDeleteConfirm(false);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.alert('Rapor Et', 'Bu özellik yakında eklenecek');
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);

      // Mesajları okundu olarak işaretle
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('match_id', matchId)
        .neq('sender_id', user?.id)
        .eq('read', false);
    } catch (error) {
      console.error('Messages error:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sendingMessage) return;

    setSendingMessage(true);
    const tempMessage = messageText.trim();
    setMessageText('');

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user?.id,
        content: tempMessage,
      });

      if (error) throw error;

      await loadMessages();
    } catch (error) {
      console.error('Send message error:', error);
      setMessageText(tempMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;
    
    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        {!isOwn && matchInfo && (
          <Image
            source={{ uri: matchInfo.otherUser.profile_photo }}
            style={styles.avatar}
          />
        )}
        <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (!matchInfo) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingSkeleton} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header - Sabit */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image
              source={{ uri: matchInfo.otherUser.profile_photo }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{matchInfo.otherUser.name}</Text>
              {matchInfo.activity && (
                <Text style={styles.headerActivity}>{matchInfo.activity}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <MoreVertical size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Messages - Scroll yapılabilir */}
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          inverted={true}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          style={styles.messagesWrapper}
        />

        {/* Input - Doğal konum, klavye ile yukarı çıkar */}
        <View style={[styles.inputWrapper, { paddingBottom: keyboardVisible ? 0 : Math.max(insets.bottom, 8) }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Mesaj..."
              placeholderTextColor="#8E8E93"
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
              <Send size={24} color={messageText.trim() ? '#8B5CF6' : '#D1D5DB'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => setShowDeleteConfirm(true), 300);
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
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.modalOptionCancelText}>İptal</Text>
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
        <TouchableOpacity
          style={styles.confirmOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(false)}
        >
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
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerActivity: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  bubble: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '70%',
  },
  bubbleOwn: {
    backgroundColor: '#8B5CF6',
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  inputWrapper: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 8,
    alignItems: 'flex-end',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#000',
    borderWidth: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    width: '100%',
    paddingHorizontal: 16,
  },
  loadingSkeleton: {
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
    marginBottom: 0,
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
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
