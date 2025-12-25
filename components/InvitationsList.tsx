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
import InvitationAcceptedModal from './InvitationAcceptedModal';

export default function InvitationsList() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ProposalInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [acceptedInvitation, setAcceptedInvitation] = useState<{
    inviterName: string;
    proposalName: string;
  } | null>(null);

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
      // Davet bilgilerini al
      const invitation = invitations.find(inv => inv.id === invitationId);
      
      await invitationsAPI.acceptInvitation(invitationId);
      
      // Modal için bilgileri ayarla
      if (invitation) {
        setAcceptedInvitation({
          inviterName: invitation.inviter.name,
          proposalName: invitation.proposal.activity_name
        });
        setShowAcceptedModal(true);
      }
      
      loadInvitations();
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
    <>
      <InvitationSwipeCards
        invitations={pendingInvitations}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onEmpty={loadInvitations}
      />

      {/* Invitation Accepted Modal */}
      <InvitationAcceptedModal
        visible={showAcceptedModal}
        onClose={() => {
          setShowAcceptedModal(false);
          setAcceptedInvitation(null);
          router.push('/(tabs)/proposals');
        }}
        onMessage={() => {
          setShowAcceptedModal(false);
          setAcceptedInvitation(null);
          router.push('/(tabs)/matches');
        }}
        inviterName={acceptedInvitation?.inviterName}
        proposalName={acceptedInvitation?.proposalName}
      />
    </>
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
