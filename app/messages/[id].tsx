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
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, XCircle, Flag } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import { messagesAPI, type Message, type MatchInfo } from '@/api/messages';

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const flatListRef = useRef<FlatList>(null);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (!matchId || !user?.id) return;
    
    // TEK API ÇAĞRISI - Her şeyi birlikte yükle
    initializeConversation();

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
  }, [matchId, user?.id]);

  const initializeConversation = async () => {
    if (!user?.id || !matchId) return;
    
    try {
      const { matchInfo: info, messages: msgs } = await messagesAPI.initializeConversation(
        matchId as string,
        user.id
      );
      setMatchInfo(info);
      setMessages(msgs);
    } catch (error) {
      console.error('Initialize conversation error:', error);
    }
  };

  const handleDeleteMatch = async () => {
    if (!matchId || !user?.id) return;
    
    console.log('Delete match called, matchId:', matchId);
    
    try {
      await messagesAPI.deleteMatch(matchId as string, user.id);
      console.log('Match deleted successfully');
      setShowDeleteConfirm(false);
      
      // Biraz bekle sonra geri dön
      setTimeout(() => {
        router.back();
      }, 300);
    } catch (error: any) {
      console.error('Delete error:', error);
      setErrorMessage(error.message || 'Sohbet sonlandırılamadı');
      setShowErrorToast(true);
      setShowDeleteConfirm(false);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    setInfoMessage('Bu özellik yakında eklenecek');
    setShowInfoToast(true);
  };

  const loadMessages = async () => {
    if (!user?.id || !matchId) return;
    
    try {
      // Real-time güncellemeler için sadece mesajları yükle
      const data = await messagesAPI.getMessages(matchId as string, user.id);
      setMessages(data);
    } catch (error) {
      console.error('Messages error:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sendingMessage || !user?.id || !matchId) return;

    setSendingMessage(true);
    const tempMessage = messageText.trim();
    setMessageText('');

    try {
      await messagesAPI.sendMessage(matchId as string, user.id, tempMessage);
      await loadMessages();
    } catch (error) {
      console.error('Send message error:', error);
      setMessageText(tempMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
        <View style={styles.messageContent}>
          <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  // Loading state'i kaldırdık - header hemen gösterilecek

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header - Sabit */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Keyboard.dismiss();
              router.back();
            }} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerCenter}
            onPress={() => matchInfo && router.push(`/profile/${matchInfo.otherUser.id}` as any)}
            activeOpacity={0.7}
            disabled={!matchInfo}
          >
            {matchInfo ? (
              <>
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
              </>
            ) : (
              <View style={styles.headerInfo}>
                <View style={styles.loadingPlaceholder} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={(event) => {
              event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                setMenuPosition({ top: pageY + height, right: 16 });
                setShowMenu(true);
              });
            }} 
            style={styles.menuButton}
          >
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
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.menuPopup, { top: menuPosition.top, right: menuPosition.right }]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
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
  loadingPlaceholder: {
    height: 20,
    width: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '75%',
  },
  bubble: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    flexShrink: 1,
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
  timeText: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 2,
  },
  timeTextOwn: {
    color: '#8E8E93',
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
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
});
