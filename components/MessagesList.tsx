import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Message, type MatchInfo } from '@/api/messages';

interface MessagesListProps {
  messages: Message[];
  matchInfo: MatchInfo | null;
  currentUserId?: string;
  onScrollToEnd?: () => void;
}

export interface MessagesListRef {
  scrollToEnd: () => void;
}

const MessagesList = forwardRef<MessagesListRef, MessagesListProps>(({ 
  messages, 
  matchInfo, 
  currentUserId,
  onScrollToEnd 
}, ref) => {
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Scroll fonksiyonunu parent'a expose et
  useImperativeHandle(ref, () => ({
    scrollToEnd: () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }));

  // Mesajlar değiştiğinde en son mesaja scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        onScrollToEnd?.();
      }, 100);
    }
  }, [messages, onScrollToEnd]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === currentUserId;
    
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

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={[styles.messagesList, { paddingBottom: insets.bottom }]}
      showsVerticalScrollIndicator={false}
      style={styles.messagesWrapper}
      contentInsetAdjustmentBehavior="automatic"
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }}
    />
  );
});

export default MessagesList;

const styles = StyleSheet.create({
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
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
});