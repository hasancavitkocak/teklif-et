import { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Heart, X, Zap, Plus, MapPin, Sparkles, SlidersHorizontal, Bell, Calendar, Clock, Store } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { discoverAPI, interestsAPI, proposalsAPI, type DiscoverProposal } from '@/api';

const { width, height } = Dimensions.get('window');

export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<DiscoverProposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [interests, setInterests] = useState<any[]>([]);

  // Sayfa her açıldığında veri yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Discover screen focused');
      if (user?.id) {
        loadProposals();
      }
    }, [user?.id, selectedCity, selectedInterest])
  );

  useEffect(() => {
    loadProposals();
    loadInterests();

    // Real-time yeni teklif dinleme
    const subscription = supabase
      .channel('proposals-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'proposals' 
      }, (payload) => {
        console.log('New proposal in feed:', payload);
        // Yeni teklif oluşturulduğunda otomatik yükle
        loadProposals();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'proposals' 
      }, (payload) => {
        console.log('Proposal deleted:', payload);
        // Teklif silindiğinde yükle
        loadProposals();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Filtre değiştiğinde otomatik yükle
  useEffect(() => {
    if (user?.id) {
      loadProposals();
    }
  }, [selectedCity, selectedInterest]);

  const loadInterests = async () => {
    try {
      const data = await interestsAPI.getAll();
      setInterests(data);
    } catch (error: any) {
      console.error('Error loading interests:', error.message);
    }
  };

  const loadProposals = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await discoverAPI.getProposals(user.id, {
        city: selectedCity,
        interestId: selectedInterest,
      });
      setProposals(data);
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
    if (currentIndex >= proposals.length || !user?.id) return;

    const proposal = proposals[currentIndex];

    try {
      // Gösterildi olarak işaretle
      await discoverAPI.markAsShown(user.id, proposal.id);

      const result = await discoverAPI.likeProposal(proposal.id, user.id, isSuperLike);
      
      if (result.matched) {
        Alert.alert('Eşleşme!', `${proposal.creator.name} ile eşleştiniz! Artık mesajlaşabilirsiniz.`);
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error: any) {
      if (error.message.includes('limit') || error.message.includes('başvurdunuz')) {
        Alert.alert('Bilgi', error.message);
        if (error.message.includes('başvurdunuz')) {
          setCurrentIndex(currentIndex + 1);
        }
      } else {
        Alert.alert('Hata', error.message);
      }
    }
  };

  const handlePass = async () => {
    if (currentIndex >= proposals.length || !user?.id) return;

    const proposal = proposals[currentIndex];

    try {
      // Gösterildi olarak işaretle
      await discoverAPI.markAsShown(user.id, proposal.id);
    } catch (error) {
      console.error('Mark as shown error:', error);
    }

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
        <Text style={styles.logoText}>Test</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={22} color="#8B5CF6" />
          </TouchableOpacity>
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
              resizeMode="cover"
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
              
              {/* Ana Container - Yan Yana */}
              <View style={styles.cardBottomContainer}>
                {/* Sol Taraf - Aktivite ve Kullanıcı */}
                <View style={styles.cardLeftInfo}>
                  <Text style={styles.activityName}>{currentProposal.activity_name}</Text>
                  <Text style={styles.userName}>
                    {currentProposal.creator.name}, {calculateAge(currentProposal.creator.birth_date)}
                  </Text>
                </View>
                
                {/* Sağ Taraf - Tarih/Saat/Mekan/Konum */}
                {(currentProposal.event_datetime || currentProposal.venue_name || currentProposal.city) && (
                  <View style={styles.cardRightInfo}>
                    {/* Tarih ve Saat - Yan Yana */}
                    {currentProposal.event_datetime && (
                      <View style={styles.dateTimeRow}>
                        <View style={styles.infoItem}>
                          <Calendar size={12} color="#FFF" />
                          <Text style={styles.infoText}>
                            {new Date(currentProposal.event_datetime).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Clock size={12} color="#FFF" />
                          <Text style={styles.infoText}>
                            {new Date(currentProposal.event_datetime).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    {/* Mekan ve Konum - Alt Alta */}
                    {currentProposal.venue_name && (
                      <View style={styles.infoItem}>
                        <Store size={12} color="#FFF" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {currentProposal.venue_name}
                        </Text>
                      </View>
                    )}
                    {currentProposal.city && (
                      <View style={styles.infoItem}>
                        <MapPin size={12} color="#FFF" />
                        <Text style={styles.infoText}>{currentProposal.city}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {/* Kategori - En Alt */}
              <View style={styles.interestChip}>
                <Text style={styles.interestText}>{currentProposal.interest.name}</Text>
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
              <Image 
                source={require('@/assets/images/puzzle-icon.png')} 
                style={{ width: 48, height: 48, tintColor: '#8B5CF6' }}
                resizeMode="contain"
              />
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
          router.push('/(tabs)/proposals');
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
  const [venueName, setVenueName] = useState('');
  const [userCity, setUserCity] = useState('');
  const [eventDate, setEventDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Yarın
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInterests();
      loadUserCity();
    }
  }, [visible]);

  const loadInterests = async () => {
    const { data } = await supabase.from('interests').select('*');
    if (data) setInterests(data);
  };

  const loadUserCity = async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single();
    if (profile?.city) {
      setUserCity(profile.city);
    }
  };

  const showDateTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDate,
        mode: 'date',
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            // Tarih seçildikten sonra saat seçiciyi aç
            DateTimePickerAndroid.open({
              value: date,
              mode: 'time',
              is24Hour: true,
              onChange: (timeEvent, time) => {
                if (timeEvent.type === 'set' && time) {
                  setEventDate(time);
                }
              },
            });
          }
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const handleCreate = async () => {
    if (!activityName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen aktivite adı girin');
      return;
    }
    
    if (!selectedInterest) {
      Alert.alert('Eksik Bilgi', 'Lütfen kategori seçin');
      return;
    }

    setLoading(true);
    try {
      await proposalsAPI.createProposal({
        creator_id: user!.id,
        activity_name: activityName.trim(),
        participant_count: 1,
        is_group: false,
        interest_id: selectedInterest,
        city: userCity || 'İstanbul',
        event_datetime: eventDate.toISOString(),
        venue_name: venueName.trim() || undefined,
      });

      Alert.alert('Başarılı', 'Teklifiniz oluşturuldu');
      setActivityName('');
      setVenueName('');
      setEventDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
      setSelectedInterest(null);
      onCreated();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.fullScreenModal} edges={['top', 'bottom']}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Teklif</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {/* Aktivite Adı */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ne yapmak istersin?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn: Kahve içmek, Sinemaya gitmek..."
                value={activityName}
                onChangeText={setActivityName}
                maxLength={100}
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            {/* Konum - Otomatik */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Konum</Text>
              <View style={styles.locationDetectedBadge}>
                <MapPin size={18} color="#8B5CF6" />
                <Text style={styles.locationDetectedText}>
                  {userCity || 'Konum alınıyor...'}
                </Text>
              </View>
            </View>

            {/* Mekan İsmi */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mekan İsmi (Opsiyonel)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Örn: Starbucks Kadıköy, Moda Sahil..."
                value={venueName}
                onChangeText={setVenueName}
                maxLength={100}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Tarih ve Saat */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tarih ve Saat Seç</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={showDateTimePicker}
              >
                <View style={styles.dateTimeDisplay}>
                  <Calendar size={18} color="#8B5CF6" />
                  <Text style={styles.dateTimeDisplayText}>
                    {eventDate.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.dateTimeDisplay}>
                  <Clock size={18} color="#8B5CF6" />
                  <Text style={styles.dateTimeDisplayText}>
                    {eventDate.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Kategori */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.interestsGrid}>
                {interests.map(interest => (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.interestChipSmall,
                      selectedInterest === interest.id && styles.interestChipSelected,
                    ]}
                    onPress={() => setSelectedInterest(interest.id)}
                  >
                    <Text
                      style={[
                        styles.interestChipText,
                        selectedInterest === interest.id && styles.interestChipTextSelected,
                      ]}
                    >
                      {interest.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            </ScrollView>

            {/* Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
      
      {/* DateTimePicker - Sadece iOS için */}
      {Platform.OS === 'ios' && showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="datetime"
          display="spinner"
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              setEventDate(date);
              setShowDatePicker(false);
            } else if (event.type === 'dismissed') {
              setShowDatePicker(false);
            }
          }}
          minimumDate={new Date()}
        />
      )}
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
    paddingBottom: 120,
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
  cardBottomContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardLeftInfo: {
    flex: 1,
    gap: 6,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  cardRightInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  puzzleIconContainer: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  puzzlePiece: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: '#8B5CF6',
  },
  puzzlePieceLeft: {
    left: 0,
    top: 7,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 8,
  },
  puzzlePieceRight: {
    right: 0,
    top: 7,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 8,
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputGroup: {
    marginBottom: 20,
  },
  dateTimeButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeDisplayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  locationDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3E8FF',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  locationDetectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  locationDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  locationDetectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
    flex: 1,
  },

  participantSelector: {
    marginBottom: 16,
  },
  participantLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  participantButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  participantButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  participantButtonTextActive: {
    color: '#FFF',
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
  groupToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  interestChipSmall: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestChipSelected: {
    backgroundColor: '#8B5CF6',
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  interestChipTextSelected: {
    color: '#FFF',
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
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  createProposalButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
