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
import { X, Check, Zap, MapPin, Calendar, Store } from 'lucide-react-native';
import { type ProposalRequest } from '@/api/proposals';

const { width, height } = Dimensions.get('window');

interface ProposalSwipeCardsProps {
  requests: ProposalRequest[];
  onAccept: (requestId: string, proposalId: string, requesterId: string) => void;
  onReject: (requestId: string) => void;
  onEmpty: () => void;
}

export default function ProposalSwipeCards({
  requests,
  onAccept,
  onReject,
  onEmpty,
}: ProposalSwipeCardsProps) {
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
    if (currentIndex >= requests.length) return;
    const request = requests[currentIndex];
    onAccept(request.id, request.proposal.id, request.requester_id);
    setCurrentIndex(currentIndex + 1);
    
    if (currentIndex + 1 >= requests.length) {
      onEmpty();
    }
  };

  const handleReject = () => {
    if (currentIndex >= requests.length) return;
    const request = requests[currentIndex];
    onReject(request.id);
    setCurrentIndex(currentIndex + 1);
    
    if (currentIndex + 1 >= requests.length) {
      onEmpty();
    }
  };

  const currentRequest = requests[currentIndex];

  if (!currentRequest) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Henüz başvuru yok</Text>
        <Text style={styles.emptySubtext}>Yeni başvurular geldiğinde burada görünecek</Text>
      </View>
    );
  }

  const profile = currentRequest.requester;
  const proposal = currentRequest.proposal;

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <Image
            source={{ uri: profile.profile_photo }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          >
            {currentRequest.is_super_like && (
              <View style={styles.superLikeBadge}>
                <Zap size={16} color="#FFF" fill="#FFF" />
                <Text style={styles.superLikeText}>Süper Beğeni</Text>
              </View>
            )}
            
            {/* Ana Container - Yan Yana */}
            <View style={styles.cardBottomContainer}>
              {/* Sol Taraf - Aktivite ve Kullanıcı */}
              <View style={styles.cardLeftInfo}>
                <Text style={styles.activityName}>{proposal.activity_name}</Text>
                <Text style={styles.userName}>
                  {profile.name}, {calculateAge(profile.birth_date)}
                </Text>
              </View>
              
              {/* Sağ Taraf - Tarih/Saat/Mekan/Konum */}
              {(proposal.event_datetime || proposal.venue_name || proposal.city) && (
                <View style={styles.cardRightInfo}>
                  {/* Tarih */}
                  {proposal.event_datetime && (
                    <View style={styles.infoItem}>
                      <Calendar size={12} color="#FFF" />
                      <Text style={styles.infoText}>
                        {new Date(proposal.event_datetime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                    </View>
                  )}
                  
                  {/* Mekan ve Konum - Alt Alta */}
                  {proposal.venue_name && (
                    <View style={styles.infoItem}>
                      <Store size={12} color="#FFF" />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {proposal.venue_name}
                      </Text>
                    </View>
                  )}
                  {proposal.city && (
                    <View style={styles.infoItem}>
                      <MapPin size={12} color="#FFF" />
                      <Text style={styles.infoText}>{proposal.city}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            {/* Kategori - En Alt */}
            {proposal.interest && (
              <View style={styles.interestChip}>
                <Text style={styles.interestText}>{proposal.interest.name}</Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.passButton} onPress={handleReject}>
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
  superLikeBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  superLikeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardBottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 12,
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
  cardRightInfo: {
    gap: 6,
    alignItems: 'flex-end',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
  interestChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
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
