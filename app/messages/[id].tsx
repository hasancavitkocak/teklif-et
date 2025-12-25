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
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MoreVertical, XCircle, Flag, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import { messagesAPI, type Message, type MatchInfo } from '@/api/messages';
import { matchesAPI } from '@/api/matches';

export default function ChatScreen() {
  const { user } = useAuth();
  const { id, archived } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const isArchived = archived === 'true'; // Arşiv modunda mı?
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
  // Inverted FlatList kullanıyoruz, scroll gerekmiyor
  useEffect(() => {
    // Inverted FlatList otomatik olarak en son mesajı gösteriyor
  }, [messages]);

  // Pulsating animation for loading icon
  useEffect(() => {
    if (messagesLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [messagesLoading, pulseAnim]);

  const initializeConversation = async () => {
    if (!user?.id || !id) return;
    
    try {
      setMessagesLoading(true);
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
      setMessagesLoading(false);
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
      
      // Inverted FlatList ile scroll gerekmiyor
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
      if (isArchived) {
        // Geçmiş sohbetlerden gizle
        await matchesAPI.hideFromUserArchive(id as string, user.id);
        setShowDeleteConfirm(false);
        setInfoMessage('Sohbet geçmiş sohbetlerden kaldırıldı');
        setShowInfoToast(true);
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        // Normal sohbeti sonlandır (geçmiş sohbetlere taşı)
        await messagesAPI.deleteMatch(id as string, user.id);
        setShowDeleteConfirm(false);
        setInfoMessage('Sohbet sonlandırıldı');
        setShowInfoToast(true);
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'İşlem gerçekleştirilemedi');
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
          <TouchableOpacity 
            onPress={isArchived ? undefined : goToProfile} 
            activeOpacity={isArchived ? 1 : 0.7}
            disabled={isArchived}
          >
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
    <SafeAreaView style={styles.container} edges={isArchived ? ['top', 'bottom'] : ['top']}>
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
            onPress={isArchived ? undefined : goToProfile} // Geçmiş sohbetlerde profile gitme
            activeOpacity={isArchived ? 1 : 0.7}
            disabled={isArchived}
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

        {/* Geçmiş Sohbet Uyarısı - Header'ın altında, Safe Area içinde */}
        {isArchived && (
          <View style={styles.archivedNotice}>
            <Text style={styles.archivedNoticeText}>
              Bu geçmiş bir sohbettir. Mesaj gönderilemez, sadece okunabilir.
            </Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={[styles.keyboardAvoidingView, isArchived && { marginTop: -insets.top + 120 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 ? (
          // Empty State - FlatList dışında
          <View style={[styles.emptyStateWrapper, isArchived && { marginTop: 0 }]}>
            {messagesLoading ? (
              <View style={styles.loadingMessages}>
                <Animated.View style={[styles.pulsatingIcon, { opacity: pulseAnim }]}>
                  <Image 
                    source={require('@/assets/images/puzzle-iconnew.png')} 
                    style={styles.loadingIcon}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Text style={styles.loadingMessagesText}>Mesajlar yükleniyor...</Text>
              </View>
            ) : (
              <View style={styles.noMessages}>
                <Image 
                  source={require('@/assets/images/puzzle-iconnew.png')} 
                  style={styles.emptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.noMessagesTitle}>Henüz mesajınız yok</Text>
                <Text style={styles.noMessagesSubtitle}>
                  {matchInfo?.otherUser?.name} ile sohbete başlamak için ilk mesajı gönderin
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Messages List
          <FlatList
            ref={flatListRef}
            data={messages.slice().reverse()}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={[styles.messagesList, isArchived && { marginTop: 0 }]}
            contentContainerStyle={[
              styles.messagesContainer, 
              isArchived && { paddingTop: 8 }
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            inverted={true}
            scrollEnabled={true}
            removeClippedSubviews={false}
          />
        )}
        
        {/* Input - Geçmiş sohbetlerde gösterme */}
        {!isArchived && (
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
        )}
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
            {!isArchived ? (
              <>
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
              </>
            ) : (
              // Geçmiş sohbetlerde sadece sil seçeneği
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(() => setShowDeleteConfirm(true), 100);
                }}
              >
                <XCircle size={20} color="#FF3B30" strokeWidth={2} />
                <Text style={styles.menuItemTextDanger}>Sohbeti Sil</Text>
              </TouchableOpacity>
            )}
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
            <Text style={styles.confirmTitle}>
              {isArchived ? 'Sohbeti Sil' : 'Sohbeti Sonlandır'}
            </Text>
            <Text style={styles.confirmMessage}>
              {isArchived 
                ? 'Bu geçmiş sohbeti kaldırmak istediğinize emin misiniz? Sadece sizin görünümünüzden kaldırılacak.'
                : 'Bu sohbeti sonlandırmak istediğinize emin misiniz? Geçmiş sohbetler bölümüne taşınacak.'
              }
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
                <Text style={styles.confirmButtonDeleteText}>
                  {isArchived ? 'Sil' : 'Sonlandır'}
                </Text>
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
    zIndex: 10, // Header'ı mesajların üstünde tut
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
    backgroundColor: '#FFFFFF',
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingTop: 8, // Daha az padding
    paddingBottom: 20, // Alt padding ekle
    flexGrow: 1,
  },
  // Empty State Styles
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    transform: [{ scaleY: -1 }], // Inverted FlatList için düzelt
  },
  loadingMessages: {
    alignItems: 'center',
    gap: 16,
  },
  pulsatingIcon: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 60,
    height: 60,
    tintColor: '#8B5CF6',
    opacity: 0.8,
  },
  loadingMessagesText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  noMessages: {
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    tintColor: '#D1D5DB',
    marginBottom: 8,
  },
  noMessagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  noMessagesSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
  archivedNotice: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    alignItems: 'center',
    zIndex: 9, // Header'ın altında ama mesajların üstünde
    elevation: 9, // Android için
  },
  archivedNoticeText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },
});