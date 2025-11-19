import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, X, Zap, Plus, MapPin, Sparkles, SlidersHorizontal } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

interface Proposal {
  id: string;
  activity_name: string;
  city: string;
  is_boosted: boolean;
  creator_id: string;
  creator: {
    name: string;
    profile_photo: string;
    birth_date: string;
  };
  interest: {
    name: string;
  };
}

export default function DiscoverScreen() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [interests, setInterests] = useState<any[]>([]);

  useEffect(() => {
    loadProposals();
    loadInterests();
  }, []);

  const loadInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setInterests(data || []);
    } catch (error: any) {
      console.error('Error loading interests:', error.message);
    }
  };

  const loadProposals = async () => {
    try {
      const { data: myRequests } = await supabase
        .from('proposal_requests')
        .select('proposal_id')
        .eq('requester_id', user?.id);

      const requestedProposalIds = myRequests?.map(r => r.proposal_id) || [];

      let query = supabase
        .from('proposals')
        .select(`
          id,
          activity_name,
          city,
          is_boosted,
          interest_id,
          creator_id,
          creator:profiles!creator_id(name, profile_photo, birth_date),
          interest:interests(name)
        `)
        .eq('status', 'active')
        .neq('creator_id', user?.id);

      if (requestedProposalIds.length > 0) {
        query = query.not('id', 'in', `(${requestedProposalIds.join(',')})`);
      }

      if (selectedCity) {
        query = query.ilike('city', `%${selectedCity}%`);
      }

      if (selectedInterest) {
        query = query.eq('interest_id', selectedInterest);
      }

      const { data, error } = await query
        .order('is_boosted', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setProposals(data as any || []);
      setCurrentIndex(0);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setLoading(true);
    loadProposals();
  };

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedInterest('');
    setFilterModalVisible(false);
    setLoading(true);
    loadProposals();
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

  const handleLike = async (isSuperLike = false) => {
    if (currentIndex >= proposals.length) return;

    const proposal = proposals[currentIndex];

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_proposals_sent, daily_super_likes_used, is_premium, last_reset_date')
        .eq('id', user?.id)
        .single();

      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      if (profile.last_reset_date !== today) {
        await supabase
          .from('profiles')
          .update({
            daily_proposals_sent: 0,
            daily_super_likes_used: 0,
            last_reset_date: today,
          })
          .eq('id', user?.id);
        profile.daily_proposals_sent = 0;
        profile.daily_super_likes_used = 0;
      }

      if (!profile.is_premium && profile.daily_proposals_sent >= 5) {
        Alert.alert('Limit Doldu', 'Premium olarak sınırsız teklif gönderebilirsiniz');
        return;
      }

      if (isSuperLike && !profile.is_premium && profile.daily_super_likes_used >= 1) {
        Alert.alert('Limit Doldu', 'Günlük super like hakkınız doldu');
        return;
      }

      const { data: existingRequest } = await supabase
        .from('proposal_requests')
        .select('id')
        .eq('proposal_id', proposal.id)
        .eq('requester_id', user?.id)
        .maybeSingle();

      if (existingRequest) {
        Alert.alert('Zaten Gönderildi', 'Bu teklife daha önce başvurdunuz');
        setCurrentIndex(currentIndex + 1);
        return;
      }

      const { error } = await supabase.from('proposal_requests').insert({
        proposal_id: proposal.id,
        requester_id: user?.id,
        is_super_like: isSuperLike,
      });

      if (error) throw error;

      const { data: reverseRequest } = await supabase
        .from('proposal_requests')
        .select('id, proposal_id')
        .eq('requester_id', proposal.creator_id)
        .maybeSingle();

      if (reverseRequest && reverseRequest.proposal_id) {
        const { data: myProposal } = await supabase
          .from('proposals')
          .select('id')
          .eq('creator_id', user?.id)
          .eq('id', reverseRequest.proposal_id)
          .maybeSingle();

        if (myProposal) {
          const user1 = user?.id! < proposal.creator_id ? user?.id! : proposal.creator_id;
          const user2 = user?.id! < proposal.creator_id ? proposal.creator_id : user?.id!;

          await supabase.from('matches').insert({
            proposal_id: proposal.id,
            user1_id: user1,
            user2_id: user2,
          });

          Alert.alert('Eşleşme!', `${proposal.creator.name} ile eşleştiniz! Artık mesajlaşabilirsiniz.`);
        }
      }

      await supabase
        .from('profiles')
        .update({
          daily_proposals_sent: profile.daily_proposals_sent + 1,
          daily_super_likes_used: isSuperLike
            ? profile.daily_super_likes_used + 1
            : profile.daily_super_likes_used,
        })
        .eq('id', user?.id);

      setCurrentIndex(currentIndex + 1);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handlePass = () => {
    setCurrentIndex(currentIndex + 1);
  };

  const currentProposal = proposals[currentIndex];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>Teklif Et</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => Alert.alert('Boost', 'Premium özelliği - Profilinizi 30 dakika öne çıkarın!')}
          >
            <Sparkles size={22} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <SlidersHorizontal size={22} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Plus size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {currentProposal ? (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Image
              source={{ uri: currentProposal.creator.profile_photo }}
              style={styles.cardImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.cardGradient}
            >
              {currentProposal.is_boosted && (
                <View style={styles.boostBadge}>
                  <Zap size={16} color="#FFF" fill="#FFF" />
                  <Text style={styles.boostText}>Boost</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.activityName}>{currentProposal.activity_name}</Text>
                <Text style={styles.userName}>
                  {currentProposal.creator.name}, {calculateAge(currentProposal.creator.birth_date)}
                </Text>
                <View style={styles.locationRow}>
                  <MapPin size={16} color="#FFF" />
                  <Text style={styles.locationText}>{currentProposal.city}</Text>
                </View>
                <View style={styles.interestChip}>
                  <Text style={styles.interestText}>{currentProposal.interest.name}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.passButton} onPress={handlePass}>
              <X size={32} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.superLikeButton}
              onPress={() => handleLike(true)}
            >
              <Zap size={28} color="#FFF" fill="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.likeButton} onPress={() => handleLike()}>
              <Heart size={32} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Şu an gösterilecek teklif yok</Text>
          <Text style={styles.emptySubtext}>Yeni teklifler için daha sonra tekrar kontrol edin</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              setCurrentIndex(0);
              loadProposals();
            }}
          >
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      )}

      <CreateProposalModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => {
          setCreateModalVisible(false);
          loadProposals();
        }}
      />

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>ŞEHİR</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Şehir adı girin"
                value={selectedCity}
                onChangeText={setSelectedCity}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>İLGİ ALANI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                <View style={styles.interestsGrid}>
                  {interests.map((interest) => (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.interestOption,
                        selectedInterest === interest.id && styles.interestOptionSelected,
                      ]}
                      onPress={() => setSelectedInterest(selectedInterest === interest.id ? '' : interest.id)}
                    >
                      <Text
                        style={[
                          styles.interestOptionText,
                          selectedInterest === interest.id && styles.interestOptionTextSelected,
                        ]}
                      >
                        {interest.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}>
              <TouchableOpacity
                style={styles.createProposalButton}
                onPress={applyFilters}
              >
                <Text style={styles.createProposalButtonText}>Filtreleri Uygula</Text>
              </TouchableOpacity>

              {(selectedCity || selectedInterest) && (
                <TouchableOpacity
                  style={[styles.createProposalButton, { backgroundColor: '#EF4444' }]}
                  onPress={clearFilters}
                >
                  <Text style={styles.createProposalButtonText}>Filtreleri Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CreateProposalModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [participantCount, setParticipantCount] = useState('2');
  const [isGroup, setIsGroup] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInterests();
    }
  }, [visible]);

  const loadInterests = async () => {
    const { data } = await supabase.from('interests').select('*');
    if (data) setInterests(data);
  };

  const handleCreate = async () => {
    if (!activityName.trim() || !selectedInterest) {
      Alert.alert('Hata', 'Lütfen aktivite adı ve kategori seçin');
      return;
    }

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase.from('proposals').insert({
        creator_id: user?.id,
        activity_name: activityName.trim(),
        description: description.trim() || null,
        location_name: locationName.trim() || null,
        participant_count: parseInt(participantCount) || 2,
        is_group: isGroup,
        interest_id: selectedInterest,
        city: profile?.city || 'İstanbul',
      });

      if (error) throw error;

      Alert.alert('Başarılı', 'Teklifiniz oluşturuldu');
      setActivityName('');
      setDescription('');
      setLocationName('');
      setParticipantCount('2');
      setIsGroup(false);
      setSelectedInterest(null);
      onCreated();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Teklif Oluştur</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Aktivite Adı *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Örn: Kahve içmek ister misin?"
              value={activityName}
              onChangeText={setActivityName}
              maxLength={100}
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Aktivite hakkında detaylar..."
              value={description}
              onChangeText={setDescription}
              maxLength={300}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Konum</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Örn: Starbucks Kadıköy"
              value={locationName}
              onChangeText={setLocationName}
              maxLength={100}
            />

            <Text style={styles.label}>Kaç Kişi?</Text>
            <View style={styles.countSelector}>
              {['2', '3', '4', '5+'].map(count => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countOption,
                    participantCount === count && styles.countOptionSelected,
                  ]}
                  onPress={() => setParticipantCount(count)}
                >
                  <Text
                    style={[
                      styles.countText,
                      participantCount === count && styles.countTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.groupToggle}
              onPress={() => setIsGroup(!isGroup)}
            >
              <View style={[styles.checkbox, isGroup && styles.checkboxActive]}>
                {isGroup && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.groupToggleTextContainer}>
                <Text style={styles.groupToggleTitle}>Grup Aktivitesi</Text>
                <Text style={styles.groupToggleSubtitle}>
                  Birden fazla kişinin katılabileceği grup etkinliği
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Kategori *</Text>
            <View style={styles.interestsGrid}>
              {interests.map(interest => (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestOption,
                    selectedInterest === interest.id && styles.interestOptionSelected,
                  ]}
                  onPress={() => setSelectedInterest(interest.id)}
                >
                  <Text
                    style={[
                      styles.interestOptionText,
                      selectedInterest === interest.id && styles.interestOptionTextSelected,
                    ]}
                  >
                    {interest.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.createProposalButton, loading && styles.disabledButton]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.createProposalButtonText}>
              {loading ? 'Oluşturuluyor...' : 'Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    padding: 24,
    paddingTop: 100,
  },
  boostBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  boostText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  cardInfo: {
    gap: 8,
  },
  activityName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    color: '#FFF',
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
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
  superLikeButton: {
    width: 56,
    height: 56,
    backgroundColor: '#F59E0B',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#10B981',
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
    paddingHorizontal: 48,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 24,
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  countSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  countOption: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  countOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  countTextSelected: {
    color: '#FFFFFF',
  },
  groupToggle: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#D1D5DB',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  groupToggleTextContainer: {
    flex: 1,
  },
  groupToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupToggleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  interestOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  interestOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  interestOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  interestOptionTextSelected: {
    color: '#FFF',
  },
  createProposalButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0.2,
  },
  createProposalButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
