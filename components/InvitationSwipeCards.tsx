import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface Invitation {
  id: string;
  status: string;
  proposal?: {
    id: string;
    activity_name: string;
    city: string;
    event_datetime?: string;
    venue_name?: string;
    interest?: {
      id: string;
      name: string;
    };
  };
  inviter?: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
}

interface InvitationSwipeCardsProps {
  invitations: Invitation[];
  onAccept: (invitationId: string, proposalId: string) => void;
  onDecline: (invitationId: string) => void;
  onEmpty: () => void;
}

export default function InvitationSwipeCards({
  invitations,
  onAccept,
  onDecline,
  onEmpty,
}: InvitationSwipeCardsProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const handleAccept = () => {
    if (currentIndex >= invitations.length) return;
    const invitation = invitations[currentIndex];
    onAccept(invitation.id, invitation.proposal.id);
    setCurrentIndex(currentIndex + 1);
    
    if (currentIndex + 1 >= invitations.length) {
      onEmpty();
    }
  };

  const handleDecline = () => {
    if (currentIndex >= invitations.length) return;
    const invitation = invitations[currentIndex];
    onDecline(invitation.id);
    setCurrentIndex(currentIndex + 1);
    
    if (currentIndex + 1 >= invitations.length) {
      onEmpty();
    }
  };

  const currentInvitation = invitations[currentIndex];

  if (!currentInvitation || !currentInvitation.proposal || !currentInvitation.inviter) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Henüz davet yok</Text>
        <Text style={styles.emptySubtext}>Yeni davetler geldiğinde burada görünecek</Text>
      </View>
    );
  }

  const proposal = currentInvitation.proposal;
  const inviter = currentInvitation.inviter;

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        <TouchableOpacity 
          style={styles.card}
          activeOpacity={0.95}
          onPress={() => router.push(`/profile/${currentInvitation.inviter_id}`)}
        >
          <Image
            source={{ uri: inviter.profile_photo }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          >
            {/* Ana Container - Yan Yana */}
            <View style={styles.cardBottomContainer}>
              {/* Sol Taraf - Aktivite ve Kullanıcı */}
              <View style={styles.cardLeftInfo}>
                <Text style={styles.activityName}>{proposal.activity_name}</Text>
                <Text style={styles.userName}>
                  {inviter.name}, {calculateAge(inviter.birth_date)}
                </Text>
              </View>
              
              {/* Sağ Taraf - Konum */}
              {proposal.city && (
                <View style={styles.locationContainer}>
                  <MapPin size={14} color="#FFF" />
                  <Text style={styles.locationText}>{proposal.city}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.passButton} onPress={handleDecline}>
          <X size={32} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeButton} onPress={handleAccept}>
          <Image 
            source={require('@/assets/images/puzzle-icon.png')} 
            style={{ width: 48, height: 48, tintColor: '#8B5CF6' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  cardWrapper: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  card: {
    width: width - 32,
    height: height * 0.54,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  cardBottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  cardLeftInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 20,
    paddingHorizontal: 40,
    paddingBottom: 32,
  },
  passButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  likeButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});
