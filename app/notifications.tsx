import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Check, Trash2, Heart, MessageCircle, UserCheck } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import InfoToast from '@/components/InfoToast';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, refreshNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  
  // Toast states
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    // Okunmadıysa okundu işaretle
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Bildirim tipine göre yönlendir
    switch (notification.type) {
      case 'match':
        router.push('/(tabs)/matches');
        break;
      case 'request_accepted':
        router.push('/(tabs)/matches');
        break;
      case 'new_request':
        router.push('/(tabs)/proposals');
        break;
      case 'proposal_invitation':
        // Davetler için ayrı bir ekran veya proposals ekranı
        router.push('/(tabs)/proposals');
        break;
      case 'invitation_accepted':
        router.push('/(tabs)/matches');
        break;
      default:
        break;
    }
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId);
    setInfoMessage('Bildirim silindi');
    setShowInfoToast(true);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <Heart size={24} color="#8B5CF6" fill="#8B5CF6" />;
      case 'request_accepted':
        return <UserCheck size={24} color="#10B981" />;
      case 'new_request':
        return <Bell size={24} color="#F59E0B" />;
      case 'proposal_invitation':
        return <MessageCircle size={24} color="#EC4899" />;
      case 'invitation_accepted':
        return <UserCheck size={24} color="#10B981" />;
      default:
        return <Bell size={24} color="#6B7280" />;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: tr });
    } catch {
      return 'Biraz önce';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Check size={18} color="#8B5CF6" />
            <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(notification.id)}
              >
                <Trash2 size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {!notification.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Bell size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyText}>Bildiriminiz yok</Text>
            <Text style={styles.emptySubtext}>
              Yeni bildirimler burada görünecek
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#000',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#8B5CF6',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: '#F9FAFB',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
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
});
