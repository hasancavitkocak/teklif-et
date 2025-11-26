import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { invitationsAPI, ProposalInvitation } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import InvitationSwipeCards from './InvitationSwipeCards';

export default function InvitationsList() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProposalInvitation[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  const handleAccept = async (invitationId: string, proposalId: string) => {
    try {
      await invitationsAPI.acceptInvitation(invitationId);
      Alert.alert(
        'Başarılı! 🎉',
        'Davet kabul edildi. Artık bu teklife başvurdunuz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              loadInvitations();
              router.push('/(tabs)/proposals');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Hata', 'Davet kabul edilirken bir hata oluştu');
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await invitationsAPI.declineInvitation(invitationId);
      loadInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Hata', 'Davet reddedilirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Sadece pending davetleri göster
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return (
    <InvitationSwipeCards
      invitations={pendingInvitations}
      onAccept={handleAccept}
      onDecline={handleDecline}
      onEmpty={loadInvitations}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
});
