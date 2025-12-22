import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { XCircle, Flag } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ErrorToast from '@/components/ErrorToast';
import InfoToast from '@/components/InfoToast';
import MessageHeader from '@/components/MessageHeader';
import MessagesList, { MessagesListRef } from '@/components/MessagesList';
import MessageInput from '@/components/MessageInput';
import { messagesAPI, type Message, type MatchInfo } from '@/api/messages';

export default function MessageDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams();
  const messagesListRef = useRef<MessagesListRef>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  
  // Toast states
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (!matchId || !user?.id) return;
    
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

    return () => {
      subscription.unsubscribe();
    };
  }, [matchId, user?.id]);

  // Mesajlar yüklendiğinde en son mesaja scroll
  useEffect(() => {
    if (messages.length > 0) {
      // MessagesList component'i kendi scroll'unu yönetecek
    }
  }, [messages]);

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

  const loadMessages = async () => {
    if (!user?.id || !matchId) return;
    
    try {
      const data = await messagesAPI.getMessages(matchId as string, user.id);
      setMessages(data);
    } catch (error) {
      console.error('Messages error:', error);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || sendingMessage || !user?.id || !matchId) return;

    setSendingMessage(true);

    try {
      await messagesAPI.sendMessage(matchId as string, user.id, messageText);
      await loadMessages();
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!matchId || !user?.id) return;
    
    try {
      await messagesAPI.deleteMatch(matchId as string, user.id);
      setShowDeleteConfirm(false);
      setTimeout(() => {
        router.back();
      }, 300);
    } catch (error: any) {
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



  return (
    <>
      {/* Header */}
      <MessageHeader 
        matchInfo={matchInfo}
        onMenuPress={() => {
          setMenuPosition({ top: 100, right: 16 });
          setShowMenu(true);
        }}
      />

      {/* Messages Container with Keyboard Avoiding */}
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <MessagesList 
          ref={messagesListRef}
          messages={messages}
          matchInfo={matchInfo}
          currentUserId={user?.id}
        />
        
        <MessageInput 
          onSendMessage={sendMessage}
          onFocus={() => {
            // Klavye açıldığında son mesaja scroll - daha uzun timeout
            setTimeout(() => {
              messagesListRef.current?.scrollToEnd();
            }, 500);
          }}
          disabled={sendingMessage}
        />
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: 60, // Header için space
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