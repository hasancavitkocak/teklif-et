import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Check, X } from 'lucide-react-native';
import { invitationsAPI, ProposalInvitation } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function InvitationsList() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProposalInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    if (!user) return;

    try {
      const data = await invitationsAPI.getReceivedInvitations(user.id);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await invitationsAPI.acceptInvitation(invitationId);
      Alert.alert(
        'Başarılı! 🎉',
        'Davet kabul edildi! Artık mesajlaşabilirsiniz.',
        [
          {
            text: 'Eşleşmelere Git',
            onPress: () => router.push('/(tabs)/matches'),
          },
          { text: 'Tamam' },
        ]
      );
      loadInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Hata', 'Davet kabul edilirken bir hata oluştu');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    Alert.alert(
      'Daveti Reddet',
      'Bu daveti reddetmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invitationId);
            try {
              await invitationsAPI.declineInvitation(invitationId);
              loadInvitations();
            } catch (error) {
              console.error('Error declining invitation:', error);
              Alert.alert('Hata', 'Davet reddedilirken bir hata oluştu');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <View style={styles.statusBadgeAccepted}>
            <Check size={12} color="#10B981" />
            <Text style={styles.statusBadgeTextAccepted}>Kabul Edildi</Text>
          </View>
        );
      case 'declined':
        return (
          <View style={styles.statusBadgeDeclined}>
            <X size={12} color="#6B7280" />
            <Text style={styles.statusBadgeTextDeclined}>Reddedildi</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderInvitation = ({ item }: { item: ProposalInvitation }) => {
    const age = item.inviter ? calculateAge(item.inviter.birth_date) : 0;
    const isProcessing = processingId === item.id;
    const isPending = item.status === 'pending';

    return (
      <View style={styles.invitationCard}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{
              uri: item.inviter?.profile_photo || 'https://via.placeholder.com/90',
            }}
            style={styles.profileImage}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {item.inviter?.name}, {age}
            </Text>
            <Text style={styles.subtitle}>seni davet etti</Text>
          </View>
          {!isPending && getStatusBadge(item.status)}
        </View>

        {/* Proposal Info */}
        <View style={styles.proposalInfo}>
          <Text style={styles.activityName}>{item.proposal?.activity_name}</Text>
          {item.proposal?.interest && (
            <View style={styles.infoRow}>
              <Ionicons name="heart" size={14} color="#8B5CF6" />
              <Text style={styles.infoText}>{item.proposal.interest.name}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#8B5CF6" />
            <Text style={styles.infoText}>{item.proposal?.city}</Text>
          </View>
        </View>

        {/* Actions */}
        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleDecline(item.id)}
              disabled={isProcessing}
              style={styles.declineButton}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#6b7280" />
              ) : (
                <>
                  <X size={18} color="#6B7280" />
                  <Text style={styles.declineButtonText}>Reddet</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAccept(item.id)}
              disabled={isProcessing}
              style={styles.acceptButton}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Check size={18} color="#FFF" />
                  <Text style={styles.acceptButtonText}>Kabul Et</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (invitations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="mail-open-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>Davet Yok</Text>
        <Text style={styles.emptyDescription}>
          Henüz hiç davet almadınız
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={invitations}
      renderItem={renderInvitation}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#8B5CF6"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
  },
  invitationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadgeAccepted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeTextAccepted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  statusBadgeDeclined: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeTextDeclined: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  proposalInfo: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  activityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
