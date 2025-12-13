import { useState, useEffect, useCallback, useRef } from 'react';
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
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { X, Zap, Plus, MapPin, Sparkles, SlidersHorizontal, Bell, Calendar, Store, ChevronDown, Crown } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { discoverAPI, interestsAPI, proposalsAPI, type DiscoverProposal } from '@/api';
import PremiumPopup from '@/components/PremiumPopup';
import SimplePremiumAlert from '@/components/SimplePremiumAlert';
import SuperLikeSuccessModal from '@/components/SuperLikeSuccessModal';

import { PROVINCES } from '@/constants/cities';

const { width, height } = Dimensions.get('window');

export default function DiscoverScreen() {
  const { user, isPremium, refreshPremiumStatus, currentCity } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<DiscoverProposal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [editingCity, setEditingCity] = useState(false);
  const [premiumPopupVisible, setPremiumPopupVisible] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState<'likes' | 'superLikes' | 'filters'>('likes');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [interests, setInterests] = useState<any[]>([]);
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(50);
  const [selectedGender, setSelectedGender] = useState<string>('all'); // 'all', 'male', 'female'
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuperLikeSuccess, setShowSuperLikeSuccess] = useState(false);
  const [superLikeUserName, setSuperLikeUserName] = useState<string>('');
  const sliderWidth = useRef(0);

  // Slider için ref
  const sliderTrackRef = useRef<View>(null);
  const sliderStartX = useRef(0);
  
  // Yaş slider için ref
  const ageSliderTrackRef = useRef<View>(null);
  const ageSliderStartX = useRef(0);
  const ageSliderWidth = useRef(0);

  // Slider PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Başlangıç pozisyonunu kaydet
        if (sliderTrackRef.current) {
          sliderTrackRef.current.measure((x, y, width, height, pageX) => {
            sliderStartX.current = pageX;
            sliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (sliderWidth.current > 0 && sliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - sliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth.current));
          const newDistance = Math.round(percentage * 99) + 1; // 1-100 km
          setMaxDistance(newDistance);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Yaş Slider PanResponder (Min)
  const ageMinPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (ageSliderTrackRef.current) {
          ageSliderTrackRef.current.measure((x, y, width, height, pageX) => {
            ageSliderStartX.current = pageX;
            ageSliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (ageSliderWidth.current > 0 && ageSliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - ageSliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / ageSliderWidth.current));
          const newAge = Math.round(percentage * 82) + 18; // 18-100 yaş
          if (newAge < maxAge) {
            setMinAge(newAge);
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Yaş Slider PanResponder (Max)
  const ageMaxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (ageSliderTrackRef.current) {
          ageSliderTrackRef.current.measure((x, y, width, height, pageX) => {
            ageSliderStartX.current = pageX;
            ageSliderWidth.current = width;
          });
        }
      },
      onPanResponderMove: (evt) => {
        if (ageSliderWidth.current > 0 && ageSliderStartX.current > 0) {
          const touchX = evt.nativeEvent.pageX;
          const relativeX = touchX - ageSliderStartX.current;
          const percentage = Math.max(0, Math.min(1, relativeX / ageSliderWidth.current));
          const newAge = Math.round(percentage * 82) + 18; // 18-100 yaş
          if (newAge > minAge) {
            setMaxAge(newAge);
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Sayfa her açıldığında veri yükle
  useFocusEffect(
    useCallback(() => {
      console.log('Discover screen focused');
      if (user?.id) {
        updateUserLocationOnFocus(); // Konum güncelle
        loadProposals();
        refreshPremiumStatus(); // Premium durumunu yenile
        
        // İlk yüklemede selectedCity'yi currentCity'den al
        if (!selectedCity && currentCity) {
          setSelectedCity(currentCity);
        }
      }
    }, [user?.id, selectedCity, selectedInterest, isPremium])
  );

  useEffect(() => {
    loadProposals();
    loadInterests();

    // Real-time yeni teklif dinleme - yeni teklifleri listeye ekle
    const subscription = supabase
      .channel('proposals-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'proposals' 
      }, async (payload) => {
        console.log('New proposal in feed:', payload);
        // Yeni teklifi arka planda yükle - index'i koruyarak
        loadProposals(false);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, selectedCity, selectedInterest]);

  // Filtre değiştiğinde otomatik yükle
  useEffect(() => {
    if (user?.id) {
      loadProposals();
    }
  }, [selectedCity, selectedInterest]);

  // AuthContext'teki currentCity değiştiğinde selectedCity'yi güncelle
  useEffect(() => {
    if (currentCity && !selectedCity) {
      console.log('🔄 AuthContext\'ten gelen şehir filtre olarak ayarlanıyor:', currentCity);
      setSelectedCity(currentCity);
    }
  }, [currentCity]);

  const updateUserLocationOnFocus = async () => {
    if (!user?.id) return;
    
    // Premium kullanıcılar için otomatik konum güncellemesi yapma
    if (isPremium) {
      console.log('👑 Premium kullanıcı, otomatik konum güncellemesi atlanıyor');
      return;
    }
    
    try {
      console.log('🔄 Ana sayfada konum güncelleniyor...');
      
      // Konum izni kontrol et
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // İzin yoksa sessizce geç, kullanıcıyı rahatsız etme
        console.log('❌ Konum izni yok, güncelleme atlanıyor');
        return;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocoding ile şehir bilgisini al
      const geocodeResults = await Location.reverseGeocodeAsync({ 
        latitude, 
        longitude 
      });
      
      if (geocodeResults && geocodeResults.length > 0) {
        const geocode = geocodeResults[0];
        
        // İlçe bilgisini akıllı şekilde belirle
        let cityName = '';
        let districtName = '';
        let regionName = geocode.region || '';
        
        // Önce district alanını kontrol et ve mapping uygula
        if (geocode.district) {
          districtName = getDistrictFromNeighborhood(geocode.district);
        }
        // Sonra subregion'ı kontrol et
        else if (geocode.subregion) {
          districtName = getDistrictFromNeighborhood(geocode.subregion);
        }
        // Son çare olarak city'yi kullan
        else if (geocode.city) {
          districtName = geocode.city;
        }
        
        // Final şehir adını oluştur
        if (districtName && regionName) {
          cityName = `${districtName}, ${regionName}`;
        } else if (districtName) {
          cityName = districtName;
        } else if (regionName) {
          cityName = regionName;
        }

        if (cityName) {
          // Profildeki şehir ve koordinat bilgilerini güncelle
          const { error } = await supabase
            .from('profiles')
            .update({
              city: cityName,
              latitude,
              longitude,
            })
            .eq('id', user.id);

          if (!error) {
            console.log('✅ Ana sayfada konum güncellendi:', cityName);
            // AuthContext'teki currentCity otomatik güncellenecek
          }
        }
      }
    } catch (error) {
      // Sessizce logla, kullanıcıyı rahatsız etme
      console.log('⚠️ Ana sayfa konum güncelleme hatası:', error);
    }
  };

  const loadInterests = async () => {
    try {
      const data = await interestsAPI.getAll();
      setInterests(data);
    } catch (error: any) {
      console.error('Error loading interests:', error.message);
    }
  };



  const loadProposals = async (resetIndex = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await discoverAPI.getProposals(user.id, {
        city: selectedCity,
        interestId: selectedInterest,
        minAge: isPremium ? minAge : undefined,
        maxAge: isPremium ? maxAge : undefined,
        gender: isPremium ? selectedGender : undefined,
      });
      setProposals(data);
      // Sadece manuel yüklemede veya filtre değişiminde index'i sıfırla
      if (resetIndex) {
        setCurrentIndex(0);
      }
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
      
      // Süper beğeni başarı pop-up'ı göster
      if (isSuperLike && !result.matched) {
        setSuperLikeUserName(proposal.creator.name);
        setShowSuperLikeSuccess(true);
        
        // Pop-up kapandıktan sonra sonraki teklifi göster
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
        }, 2500);
        return;
      }
      
      if (result.matched) {
        Alert.alert('Eşleşme!', `${proposal.creator.name} ile eşleştiniz! Artık mesajlaşabilirsiniz.`);
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error: any) {
      if (error.message.includes('limit') || error.message.includes('başvurdunuz')) {
        // Limit hatası - Premium popup göster
        if (error.message.includes('limit')) {
          setPremiumFeature(isSuperLike ? 'superLikes' : 'likes');
          setPremiumPopupVisible(true);
        } else {
          Alert.alert('Bilgi', error.message);
        }
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
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/profile/${currentProposal.creator_id}` as any)}
            activeOpacity={0.95}
          >
            <Image
              source={{ uri: currentProposal.creator.profile_photo }}
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
                  <Text style={styles.activityName}>{currentProposal.activity_name}</Text>
                  <Text style={styles.userName}>
                    {currentProposal.creator.name}, {calculateAge(currentProposal.creator.birth_date)}
                  </Text>
                </View>
                
                {/* Sağ Taraf - Tarih/Saat/Mekan/Konum */}
                {(currentProposal.event_datetime || currentProposal.venue_name || currentProposal.city) && (
                  <View style={styles.cardRightInfo}>
                    {/* Tarih */}
                    {currentProposal.event_datetime && (
                      <View style={styles.infoItem}>
                        <Calendar size={12} color="#FFF" />
                        <Text style={styles.infoText}>
                          {new Date(currentProposal.event_datetime).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                          })}
                        </Text>
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
              {currentProposal.interest && (
                <View style={styles.interestChip}>
                  <Text style={styles.interestText}>{currentProposal.interest.name}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

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
                source={require('@/assets/images/puzzle-iconnew.png')} 
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

      {/* Premium Popup */}
      <PremiumPopup
        visible={premiumPopupVisible}
        onClose={() => setPremiumPopupVisible(false)}
        feature={premiumFeature}
      />

      {/* Simple Premium Alert */}
      <SimplePremiumAlert
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFilterModalVisible(false);
          setShowAdvancedFilters(false);
          setEditingCity(false);
        }}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay} 
          activeOpacity={1}
          onPress={() => {
            setFilterModalVisible(false);
            setShowAdvancedFilters(false);
            setEditingCity(false);
          }}
        >
          <TouchableOpacity 
            style={styles.filterModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.filterModalHeader}>
              {showAdvancedFilters ? (
                <TouchableOpacity
                  style={styles.backToBasicButton}
                  onPress={() => setShowAdvancedFilters(false)}
                >
                  <ChevronDown size={20} color="#8B5CF6" style={{ transform: [{ rotate: '90deg' }] }} />
                  <Text style={styles.backToBasicButtonText}>Geri</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <Text style={styles.filterModalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => {
                setFilterModalVisible(false);
                setShowAdvancedFilters(false);
                setEditingCity(false);
              }}>
                <X size={22} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView 
              style={styles.filterModalBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {!showAdvancedFilters ? (
                <>
                  {/* Basit Filtreler */}
                  {/* Kategori Dropdown */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Kategori</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowInterestDropdown(!showInterestDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {selectedInterest
                          ? interests.find((i) => i.id === selectedInterest)?.name || 'Kategori Seç'
                          : 'Tümü'}
                      </Text>
                      <ChevronDown size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>

                  {/* Tarih Filtresi */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Tarih</Text>
                    <TouchableOpacity
                      style={styles.dateFilterButton}
                      onPress={() => {
                        if (Platform.OS === 'android') {
                          DateTimePickerAndroid.open({
                            value: selectedDate || new Date(),
                            mode: 'date',
                            is24Hour: true,
                            minimumDate: new Date(),
                            onChange: (event, date) => {
                              if (event.type === 'set' && date) {
                                setSelectedDate(date);
                              }
                            },
                          });
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                    >
                      <Calendar size={18} color="#8B5CF6" />
                      <Text style={styles.dateFilterButtonText}>
                        {selectedDate
                          ? selectedDate.toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Tüm Tarihler'}
                      </Text>
                      {selectedDate && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedDate(null);
                          }}
                          style={styles.clearDateButton}
                        >
                          <X size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Gelişmiş Filtre Butonu */}
                  <TouchableOpacity
                    style={styles.advancedFilterButton}
                    onPress={() => {
                      if (isPremium) {
                        setShowAdvancedFilters(true);
                      } else {
                        setShowPremiumModal(true);
                      }
                    }}
                  >
                    <View style={styles.advancedFilterButtonContent}>
                      <SlidersHorizontal size={20} color="#8B5CF6" />
                      <Text style={styles.advancedFilterButtonText}>Gelişmiş Filtreler</Text>
                      {!isPremium && <Crown size={16} color="#F59E0B" fill="#F59E0B" />}
                    </View>
                    <ChevronDown size={18} color="#8B5CF6" style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Gelişmiş Filtreler */}
                  {/* Şehir */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Şehir</Text>
                    
                    {!editingCity ? (
                      <View style={styles.cityDisplayContainer}>
                        <View style={styles.cityDisplay}>
                          <MapPin size={18} color="#8B5CF6" />
                          <Text style={styles.cityDisplayText}>
                            {selectedProvince && selectedDistrict
                              ? `${selectedDistrict}, ${PROVINCES.find(p => p.id === selectedProvince)?.name}`
                              : currentCity || 'Konum alınıyor...'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editCityButton}
                          onPress={() => setEditingCity(true)}
                        >
                          <Text style={styles.editCityButtonText}>Değiştir</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.cityEditContainer}>
                        {/* İl Seçimi */}
                        <View style={styles.citySelectGroup}>
                          <Text style={styles.citySelectLabel}>İl</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => {
                              setShowProvinceDropdown(!showProvinceDropdown);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {selectedProvince
                                ? PROVINCES.find(p => p.id === selectedProvince)?.name || 'İl Seç'
                                : 'İl Seç'}
                            </Text>
                            <ChevronDown size={20} color="#8B5CF6" />
                          </TouchableOpacity>
                          
                          {showProvinceDropdown && (
                            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                              {PROVINCES.map((province) => (
                                <TouchableOpacity
                                  key={province.id}
                                  style={[
                                    styles.dropdownItem,
                                    selectedProvince === province.id && styles.dropdownItemActive,
                                  ]}
                                  onPress={() => {
                                    setSelectedProvince(province.id);
                                    setSelectedDistrict('');
                                    setShowProvinceDropdown(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      selectedProvince === province.id && styles.dropdownItemTextActive,
                                    ]}
                                  >
                                    {province.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>

                        {/* İlçe Seçimi */}
                        {selectedProvince && (
                          <View style={styles.citySelectGroup}>
                            <Text style={styles.citySelectLabel}>İlçe</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => {
                                setShowDistrictDropdown(!showDistrictDropdown);
                                setShowProvinceDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownButtonText}>
                                {selectedDistrict || 'İlçe Seç'}
                              </Text>
                              <ChevronDown size={20} color="#8B5CF6" />
                            </TouchableOpacity>
                            
                            {showDistrictDropdown && (
                              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                                {PROVINCES.find(p => p.id === selectedProvince)?.districts.map((district) => (
                                  <TouchableOpacity
                                    key={district}
                                    style={[
                                      styles.dropdownItem,
                                      selectedDistrict === district && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => {
                                      setSelectedDistrict(district);
                                      setShowDistrictDropdown(false);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.dropdownItemText,
                                        selectedDistrict === district && styles.dropdownItemTextActive,
                                      ]}
                                    >
                                      {district}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            )}
                          </View>
                        )}

                        {/* Butonlar */}
                        <View style={styles.cityEditButtons}>
                          <TouchableOpacity
                            style={styles.cityEditCancel}
                            onPress={() => {
                              setEditingCity(false);
                              setShowProvinceDropdown(false);
                              setShowDistrictDropdown(false);
                            }}
                          >
                            <Text style={styles.cityEditCancelText}>İptal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cityEditDone}
                            onPress={() => {
                              if (selectedProvince && selectedDistrict) {
                                const provinceName = PROVINCES.find(p => p.id === selectedProvince)?.name;
                                setSelectedCity(`${selectedDistrict}, ${provinceName}`);
                                setEditingCity(false);
                                setShowProvinceDropdown(false);
                                setShowDistrictDropdown(false);
                              } else {
                                Alert.alert('Uyarı', 'Lütfen il ve ilçe seçin');
                              }
                            }}
                          >
                            <Text style={styles.cityEditDoneText}>Tamam</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Yaş Aralığı */}
                  <View style={styles.filterSection}>
                    <View style={styles.filterLabelRow}>
                      <Text style={styles.filterLabel}>Yaş Aralığı</Text>
                      <Text style={styles.filterValue}>{minAge} - {maxAge}</Text>
                    </View>
                    <View style={styles.ageSliderContainer}>
                      <Text style={styles.sliderMinMax}>18</Text>
                      <View
                        ref={ageSliderTrackRef}
                        style={styles.sliderTrack}
                      >
                        {/* Fill between min and max */}
                        <View style={[
                          styles.sliderFill,
                          {
                            left: `${((minAge - 18) / 82) * 100}%`,
                            width: `${((maxAge - minAge) / 82) * 100}%`,
                          }
                        ]} />
                        {/* Min Thumb */}
                        <View
                          style={[styles.sliderThumb, { left: `${((minAge - 18) / 82) * 100}%` }]}
                          {...ageMinPanResponder.panHandlers}
                        />
                        {/* Max Thumb */}
                        <View
                          style={[styles.sliderThumb, { left: `${((maxAge - 18) / 82) * 100}%` }]}
                          {...ageMaxPanResponder.panHandlers}
                        />
                      </View>
                      <Text style={styles.sliderMinMax}>100</Text>
                    </View>
                  </View>

                  {/* Cinsiyet */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Cinsiyet</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'all' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('all')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'all' && styles.genderButtonTextActive,
                        ]}>
                          Hepsi
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'male' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('male')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'male' && styles.genderButtonTextActive,
                        ]}>
                          Erkek
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          selectedGender === 'female' && styles.genderButtonActive,
                        ]}
                        onPress={() => setSelectedGender('female')}
                      >
                        <Text style={[
                          styles.genderButtonText,
                          selectedGender === 'female' && styles.genderButtonTextActive,
                        ]}>
                          Kadın
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Kategori Dropdown */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Kategori</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowInterestDropdown(!showInterestDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {selectedInterest
                          ? interests.find((i) => i.id === selectedInterest)?.name || 'Kategori Seç'
                          : 'Tümü'}
                      </Text>
                      <ChevronDown size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                  </View>

                  {/* Tarih Filtresi */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Tarih</Text>
                    <TouchableOpacity
                      style={styles.dateFilterButton}
                      onPress={() => {
                        if (Platform.OS === 'android') {
                          DateTimePickerAndroid.open({
                            value: selectedDate || new Date(),
                            mode: 'date',
                            is24Hour: true,
                            minimumDate: new Date(),
                            onChange: (event, date) => {
                              if (event.type === 'set' && date) {
                                setSelectedDate(date);
                              }
                            },
                          });
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                    >
                      <Calendar size={18} color="#8B5CF6" />
                      <Text style={styles.dateFilterButtonText}>
                        {selectedDate
                          ? selectedDate.toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Tüm Tarihler'}
                      </Text>
                      {selectedDate && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedDate(null);
                          }}
                          style={styles.clearDateButton}
                        >
                          <X size={16} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Kategori Dropdown - Modal Seviyesinde */}
            {showInterestDropdown && (
              <View style={styles.dropdownOverlay}>
                <ScrollView style={styles.dropdownListFixed} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedInterest('');
                      setShowInterestDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Tümü</Text>
                  </TouchableOpacity>
                  {interests.map((interest) => (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.dropdownItem,
                        selectedInterest === interest.id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedInterest(interest.id);
                        setShowInterestDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedInterest === interest.id && styles.dropdownItemTextActive,
                        ]}
                      >
                        {interest.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={[
                  styles.filterClearButton,
                  (!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all' && !selectedDate) && styles.filterClearButtonDisabled
                ]}
                onPress={() => {
                  if (selectedCity || selectedInterest || minAge !== 18 || maxAge !== 50 || selectedGender !== 'all' || selectedDate) {
                    setSelectedCity('');
                    setSelectedInterest('');
                    setMinAge(18);
                    setMaxAge(50);
                    setSelectedGender('all');
                    setSelectedDate(null);
                    setShowInterestDropdown(false);
                    setShowAdvancedFilters(false);
                  }
                }}
                disabled={!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all' && !selectedDate}
              >
                <Text style={[
                  styles.filterClearButtonText,
                  (!selectedCity && !selectedInterest && minAge === 18 && maxAge === 50 && selectedGender === 'all') && styles.filterClearButtonTextDisabled
                ]}>
                  Temizle
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterApplyButton,
                  editingCity && styles.filterApplyButtonDisabled
                ]}
                onPress={() => {
                  if (!editingCity) {
                    setFilterModalVisible(false);
                    setShowInterestDropdown(false);
                    setShowAdvancedFilters(false);
                    applyFilters();
                  }
                }}
                disabled={editingCity}
              >
                <Text style={styles.filterApplyButtonText}>
                  {editingCity ? 'Şehir seçimini tamamlayın' : 'Uygula'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DateTimePicker - iOS için */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerOverlay}>
            <TouchableOpacity
              style={styles.datePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => {
                  setSelectedDate(null);
                  setShowDatePicker(false);
                }}>
                  <Text style={styles.datePickerCancel}>İptal</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Tarih Seç</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Tamam</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                minimumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Super Like Success Modal */}
      <SuperLikeSuccessModal
        visible={showSuperLikeSuccess}
        onClose={() => setShowSuperLikeSuccess(false)}
        userName={superLikeUserName}
      />
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
  const { user, currentCity } = useAuth();
  const [activityName, setActivityName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [eventDate, setEventDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Yarın
  const [showDatePicker, setShowDatePicker] = useState(false);
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



  const showDateTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDate,
        mode: 'date',
        is24Hour: true,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setEventDate(date);
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
      // Kullanıcının koordinatlarını al
      const { data: userData } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user!.id)
        .single();

      await proposalsAPI.createProposal({
        creator_id: user!.id,
        activity_name: activityName.trim(),
        participant_count: 1,
        is_group: false,
        interest_id: selectedInterest,
        city: currentCity || 'İstanbul',
        latitude: userData?.latitude,
        longitude: userData?.longitude,
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
                  {currentCity || 'Konum alınıyor...'}
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

            {/* Tarih */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tarih Seç</Text>
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
          mode="date"
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
  // Yeni Filtre Modal Stilleri
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: 'visible',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionLast: {
    marginBottom: 24,
    overflow: 'visible',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  premiumButton: {
    padding: 4,
  },
  cityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cityDisplayText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  editCityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  editCityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  cityEditContainer: {
    gap: 12,
  },
  citySelectGroup: {
    gap: 8,
    marginBottom: 16,
  },
  citySelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  cityEditButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cityEditCancel: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cityEditCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  cityEditDone: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cityEditDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  filterInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sliderMinMax: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginLeft: -10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    zIndex: 10000,
  },
  dropdownListFixed: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 999,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#F3E8FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  filterClearButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  filterClearButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterClearButtonTextDisabled: {
    color: '#9CA3AF',
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterApplyButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  filterApplyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Premium Modal Stilleri
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  premiumModalIcon: {
    marginBottom: 20,
  },
  premiumModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  premiumModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  premiumFeaturesList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  premiumFeatureIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  premiumModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  premiumModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumModalUpgradeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  premiumModalUpgradeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  // Gelişmiş Filtre Stilleri
  advancedFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  advancedFilterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advancedFilterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  backToBasicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToBasicButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  ageSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderButtonTextActive: {
    color: '#FFF',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateFilterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerBackdrop: {
    flex: 1,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  datePickerCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});
