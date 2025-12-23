import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, XCircle, Flag, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import { messagesAPI, type Message, type MatchInfo } from '@/api/messages';

export default function ChatScreen() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || !user?.id) return;
    
    initializeConversation();

    // Real-time mesaj dinleme
    const subscription = supabase
      .channel(`messages-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `match_id=eq.${id}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, user?.id]);

  // Mesajlar yüklendiğinde en son mesaja scroll
  useEffect(() => {
    if (messages.length > 0) {
      // Daha kısa timeout ile hızlı scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [messages]);

  const initializeConversation = async () => {
    if (!user?.id || !id) return;
    
    try {
      const { matchInfo: info, messages: msgs } = await messagesAPI.initializeConversation(
        id as string,
        user.id
      );
      setMatchInfo(info);
      setMessages(msgs);
    } catch (error) {
      console.error('Initialize conversation error:', error);
      setErrorMessage('Sohbet yüklenirken hata oluştu');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!user?.id || !id) return;
    
    try {
      const data = await messagesAPI.getMessages(id as string, user.id);
      setMessages(data);
    } catch (error) {
      console.error('Messages error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !user?.id || !id) return;

    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await messagesAPI.sendMessage(id as string, user.id, messageContent);
      await loadMessages();
      
      // Mesaj gönderildikten sonra scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 50);
    } catch (error: any) {
      console.error('Send message error:', error);
      setErrorMessage('Mesaj gönderilemedi');
      setShowErrorToast(true);
      setNewMessage(messageContent); // Mesajı geri koy
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!id || !user?.id) return;
    
    try {
      await messagesAPI.deleteMatch(id as string, user.id);
      setShowDeleteConfirm(false);
      setInfoMessage('Sohbet sonlandırıldı');
      setShowInfoToast(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      setErrorMessage(error.message || 'Sohbet sonlandırılamadı');
      setShowErrorToast(true);
      setShowDeleteConfirm(false);
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    setInfoMessage('Rapor gönderildi. İnceleme süreci başlatıldı.');
    setShowInfoToast(true);
  };

  const goToProfile = () => {
    setShowMenu(false);
    if (matchInfo?.otherUser?.id) {
      router.push(`/profile/${matchInfo.otherUser.id}` as any);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.sender_id === user?.id;
    
    return (
      <View style={styles.messageRow}>
        {!isCurrentUser && matchInfo && (
          <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
            <Image
              source={{ uri: matchInfo.otherUser.profile_photo }}
              style={styles.messageAvatar}
            />
          </TouchableOpacity>
        )}
        
        <View style={[
          styles.messageContent,
          isCurrentUser ? styles.messageContentRight : styles.messageContentLeft
        ]}>
          <View style={styles.messageWithTime}>
            <View style={[
              styles.messageBubble,
              isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
            ]}>
              <Text style={[
                styles.messageText,
                isCurrentUser ? styles.currentUserText : styles.otherUserText,
              ]}>
                {item.content}
              </Text>
            </View>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft,
            ]}>
              {formatMessageTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Sohbet yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerCenter}
            onPress={goToProfile}
            activeOpacity={0.7}
          >
            {matchInfo ? (
              <>
                <Image
                  source={{ uri: matchInfo.otherUser.profile_photo }}
                  style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                  <Text style={styles.headerName}>{matchInfo.otherUser.name}</Text>
                  <Text style={styles.headerActivity}>{matchInfo.activity}</Text>
                </View>
              </>
            ) : (
              <View style={styles.headerInfo}>
                <View style={styles.loadingPlaceholder} />
                <View style={[styles.loadingPlaceholder, { width: 80, height: 12, marginTop: 4 }]} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowMenu(true)}
            style={styles.menuButton}
          >
            <MoreVertical size={22} color="#000000" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={messages.length === 0 ? styles.messagesContainerEmpty : styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }
          }}
          onLayout={() => {
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
        />
        
        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yaz..."
            placeholderTextColor="#8E8E93"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
          >
            {sendingMessage ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Send
                size={20}
                color={newMessage.trim() ? '#FFFFFF' : '#C7C7CC'}
                strokeWidth={2}
              />
            )}
          </TouchableOpacity>
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
          <View style={styles.menuPopup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={goToProfile}
            >
              <User size={20} color="#8B5CF6" strokeWidth={2} />
              <Text style={styles.menuItemText}>Profile Git</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReport}
            >
              <Flag size={20} color="#F59E0B" strokeWidth={2} />
              <Text style={styles.menuItemTextWarning}>Rapor Et</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
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
          style={styles.confirmOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Sohbeti Sonlandır</Text>
            <Text style={styles.confirmMessage}>
              Bu sohbeti sonlandırmak istediğinize emin misiniz? Bu işlem geri alınamaz.
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 64,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  headerActivity: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    height: 16,
    width: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messagesContainerEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 4,
  },
  messageContent: {
    flex: 1,
  },
  messageContentLeft: {
    alignItems: 'flex-start',
    marginLeft: 0,
  },
  messageContentRight: {
    alignItems: 'flex-end',
    marginLeft: 40, // Avatar alanı kadar boşluk bırak
  },
  messageWithTime: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '85%',
    minWidth: 60,
  },
  currentUserBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
  },
  messageTimeLeft: {
    color: '#8E8E93',
  },
  messageTimeRight: {
    color: '#8E8E93',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#F2F2F7',
    shadowOpacity: 0,
    elevation: 0,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuPopup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  menuItemTextWarning: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '500',
  },
  menuItemTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
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
    color: '#FFFFFF',
  },
});