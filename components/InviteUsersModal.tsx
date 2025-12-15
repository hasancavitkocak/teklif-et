import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronDown, X, MapPin, SlidersHorizontal, Crown } from 'lucide-react-native';
import { invitationsAPI } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { PROVINCES } from '@/constants/cities';
import { supabase } from '@/lib/supabase';
import SimplePremiumAlert from './SimplePremiumAlert';

interface User {
  id: string;
  name: string;
  profile_photo: string;
  birth_date: string;
  city: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface InviteUsersModalProps {
  visible: boolean;
  onClose: () => void;
  proposalId: string;
  proposalName: string;
  proposalCity: string;
  proposalInterestId: string;
  onInviteSent?: () => void;
}

export default function InviteUsersModal({
  visible,
  onClose,
  proposalId,
  proposalName,
  proposalCity,
  proposalInterestId,
  onInviteSent,
}: InviteUsersModalProps) {
  const { user, isPremium } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [remainingInvitations, setRemainingInvitations] = useState<number>(0);
  
  // Filtreleme state'leri
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPremiumAlert, setShowPremiumAlert] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [editingCity, setEditingCity] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(50);
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');

  // Yaş slider refs
  const ageSliderTrackRef = useRef<View>(null);
  const ageSliderStartX = useRef(0);
  const ageSliderWidth = useRef(0);

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
          const newAge = Math.round(percentage * 82) + 18;
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
          const newAge = Math.round(percentage * 82) + 18;
          if (newAge > minAge) {
            setMaxAge(newAge);
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  useEffect(() => {
    if (visible && user) {
      loadInvitableUsers();
      loadRemainingInvitations();
    }
  }, [visible, proposalId]);

  const loadRemainingInvitations = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_remaining_invitations', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      setRemainingInvitations(data || 0);
    } catch (error) {
      console.error('Error loading remaining invitations:', error);
    }
  };

  const loadInvitableUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('📋 loadInvitableUsers çağrıldı');
      console.log('State:', { selectedProvince, selectedDistrict, proposalCity });
      
      // Şehir bilgisini hazırla
      let cityFilter = proposalCity;
      let filterCoordinates = null;
      
      if (selectedProvince && selectedDistrict) {
        const provinceName = PROVINCES.find(p => p.id === selectedProvince)?.name;
        cityFilter = `${selectedDistrict}, ${provinceName}`;
        
        // Seçilen şehir için koordinat al
        console.log('🔍 Filtre şehri için koordinat alınıyor:', cityFilter);
        
        // Önce cache'den dene
        const { getCityCoordinates } = await import('@/constants/cityCoordinates');
        let coordinates = getCityCoordinates(cityFilter);
        
        // Bulunamazsa Geocoding API'den al
        if (!coordinates) {
          console.log('📍 Geocoding API kullanılıyor...');
          const { geocodeCity } = await import('@/utils/geocoding');
          const geocoded = await geocodeCity(cityFilter);
          
          if (geocoded) {
            coordinates = { lat: geocoded.latitude, lon: geocoded.longitude };
          }
        }
        
        if (coordinates) {
          filterCoordinates = coordinates;
          console.log('✅ Filtre koordinatları:', coordinates);
        }
      }

      console.log('Loading users with filters:', {
        city: cityFilter,
        coordinates: filterCoordinates,
        interestId: proposalInterestId,
        minAge,
        maxAge,
        gender: selectedGender,
      });

      const data = await invitationsAPI.getInvitableUsers(proposalId, user.id, {
        city: cityFilter,
        latitude: filterCoordinates?.lat,
        longitude: filterCoordinates?.lon,
        interestId: proposalInterestId,
        minAge,
        maxAge,
        gender: selectedGender,
      });
      
      console.log('Loaded users:', data.length);
      
      // Mevcut kullanıcının konumunu al
      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();
      
      // Uzaklık hesapla (Haversine formülü)
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Dünya'nın yarıçapı (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
      };
      
      const usersWithDistance = (data as User[]).map(userData => {
        let distance = 0;
        
        // Eğer her iki kullanıcının da koordinatları varsa gerçek uzaklık hesapla
        if (
          currentUserData?.latitude && 
          currentUserData?.longitude && 
          userData.latitude && 
          userData.longitude
        ) {
          distance = calculateDistance(
            currentUserData.latitude,
            currentUserData.longitude,
            userData.latitude,
            userData.longitude
          );
        } else {
          // Koordinat yoksa şehir bazlı tahmin
          const userCityParts = userData.city.split(',');
          const userDistrict = userCityParts[0]?.trim() || '';
          const userProvince = userCityParts[1]?.trim() || userData.city;
          
          const proposalCityParts = cityFilter.split(',');
          const proposalDistrict = proposalCityParts[0]?.trim() || '';
          const proposalProvince = proposalCityParts[1]?.trim() || cityFilter;
          
          // Aynı ilçe ise 1-5 km
          if (userDistrict && proposalDistrict && userDistrict === proposalDistrict) {
            distance = Math.floor(Math.random() * 5) + 1;
          }
          // Aynı il, farklı ilçe ise 10-30 km
          else if (userProvince === proposalProvince) {
            distance = Math.floor(Math.random() * 21) + 10;
          }
          // Farklı il ise 50-100 km
          else {
            distance = Math.floor(Math.random() * 51) + 50;
          }
        }
        
        return {
          ...userData,
          distance,
        };
      });
      
      // Uzaklığa göre sırala (azdan çoğa)
      usersWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      setUsers(usersWithDistance);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    setShowAdvancedFilters(false);
    setEditingCity(false);
    loadInvitableUsers();
  };

  const clearFilters = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setMinAge(18);
    setMaxAge(50);
    setSelectedGender('all');
    setShowFilters(false);
    setShowAdvancedFilters(false);
    setEditingCity(false);
    loadInvitableUsers();
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      // Premium olmayan kullanıcılar için limit kontrolü
      if (!isPremium && newSelected.size >= remainingInvitations) {
        Alert.alert(
          'Davet Limiti',
          `Günlük davet limitiniz doldu. Kalan davet hakkınız: ${remainingInvitations}\n\nPremium üyelik ile sınırsız davet gönderebilirsiniz.`,
          [
            { text: 'Tamam', style: 'default' },
            { 
              text: 'Premium Ol', 
              style: 'default',
              onPress: () => {
                onClose();
                // Premium sayfasına yönlendir
                // router.push('/(tabs)/premium');
              }
            }
          ]
        );
        return;
      }
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSendInvitations = async () => {
    if (!user || selectedUsers.size === 0) return;

    // Premium olmayan kullanıcılar için limit kontrolü
    if (!isPremium && selectedUsers.size > remainingInvitations) {
      Alert.alert(
        'Davet Limiti',
        `Günlük davet limitinizi aştınız. Kalan davet hakkınız: ${remainingInvitations}\n\nPremium üyelik ile sınırsız davet gönderebilirsiniz.`,
        [
          { text: 'Tamam', style: 'default' },
          { 
            text: 'Premium Ol', 
            style: 'default',
            onPress: () => {
              onClose();
              // Premium sayfasına yönlendir
              // router.push('/(tabs)/premium');
            }
          }
        ]
      );
      return;
    }

    setSending(true);
    try {
      await invitationsAPI.inviteUsers(
        proposalId,
        user.id,
        Array.from(selectedUsers)
      );
      
      // Kalan davet sayısını güncelle
      loadRemainingInvitations();
      
      // Listeyi yenile
      onInviteSent?.();
      
      // Seçili kullanıcıları temizle
      setSelectedUsers(new Set());
      
      // Kullanıcı listesini yenile (davet edilenleri çıkar)
      loadInvitableUsers();
      
      Alert.alert(
        'Başarılı! 🎉',
        `${selectedUsers.size} kullanıcıya davet gönderildi`
      );
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      
      if (error.message?.includes('duplicate')) {
        Alert.alert('Uyarı', 'Bazı kullanıcılar zaten davet edilmiş');
      } else if (error.message?.includes('limit')) {
        Alert.alert('Davet Limiti', 'Günlük davet limitinizi aştınız. Premium üyelik ile sınırsız davet gönderebilirsiniz.');
      } else {
        Alert.alert('Hata', 'Davetler gönderilirken bir hata oluştu');
      }
    } finally {
      setSending(false);
    }
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

  const renderUser = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.has(item.id);
    const age = calculateAge(item.birth_date);
    
    // Şehir bilgisinden il adını çıkar
    const cityParts = item.city.split(',');
    const province = cityParts.length > 1 ? cityParts[1].trim() : item.city;
    
    // Uzaklık bilgisi zaten item'da mevcut
    const distance = item.distance || 0;

    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(item.id)}
        activeOpacity={0.8}
        style={styles.storyCard}
      >
        {/* Instagram Story Tarzı Yuvarlak Fotoğraf */}
        <View style={[styles.storyCircle, isSelected && styles.storyCircleSelected]}>
          <Image
            source={{ uri: item.profile_photo || 'https://via.placeholder.com/200' }}
            style={styles.storyPhoto}
          />
          {isSelected && (
            <View style={styles.storyCheckmark}>
              <Ionicons name="checkmark-circle" size={28} color="#8B5CF6" />
            </View>
          )}
        </View>

        {/* Kullanıcı Bilgileri */}
        <Text style={styles.storyName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.storyAge}>{age}</Text>
        
        {/* Konum */}
        <View style={styles.storyLocation}>
          <Ionicons name="location" size={10} color="#8B5CF6" />
          <Text style={styles.storyLocationText} numberOfLines={1}>{province}</Text>
        </View>
        
        {/* Uzaklık */}
        <Text style={styles.storyDistance}>
          {distance < 1 ? `${distance * 1000}m` : `${distance}km`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Filtre Modal - Keşfet sayfası ile aynı tasarım */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFilters(false);
          setShowAdvancedFilters(false);
          setEditingCity(false);
        }}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay} 
          activeOpacity={1}
          onPress={() => {
            setShowFilters(false);
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
                setShowFilters(false);
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
                  <Text style={styles.filterDescription}>
                    Varsayılan olarak teklifin şehri ve ilgi alanı kullanılıyor
                  </Text>

                  {/* Gelişmiş Filtre Butonu */}
                  <TouchableOpacity
                    style={styles.advancedFilterButton}
                    onPress={() => {
                      if (isPremium) {
                        setShowAdvancedFilters(true);
                      } else {
                        setShowPremiumAlert(true);
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
                              : proposalCity}
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
                      <View style={styles.sliderTrack} ref={ageSliderTrackRef}>
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
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={clearFilters}
              >
                <Text style={styles.filterClearButtonText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={applyFilters}
              >
                <Text style={styles.filterApplyButtonText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Ana Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={26} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Kullanıcı Davet Et</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {proposalName}
              </Text>
              {!isPremium && (
                <Text style={styles.invitationLimit}>
                  Kalan davet: {remainingInvitations === 999 ? '∞' : remainingInvitations}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={styles.filterButton}
              >
                <Ionicons name="options-outline" size={22} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendInvitations}
                disabled={selectedUsers.size === 0 || sending}
                style={[
                  styles.sendButton,
                  (selectedUsers.size === 0 || sending) && styles.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View style={styles.sendButtonContent}>
                    <Ionicons name="paper-plane" size={20} color="white" />
                    {selectedUsers.size > 0 && (
                      <View style={styles.sendBadge}>
                        <Text style={styles.sendBadgeText}>{selectedUsers.size}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Selection Summary */}
        {selectedUsers.size > 0 && (
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionText}>
              {selectedUsers.size} kişi seçildi
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>Davet Edilecek Kullanıcı Yok</Text>
              <Text style={styles.emptyDescription}>
                Aynı şehirde henüz davet edilebilecek kullanıcı bulunmuyor
              </Text>
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              <View style={styles.usersGrid}>
                {users.map((item) => (
                  <View key={item.id}>
                    {renderUser({ item })}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>

      {/* Premium Alert */}
      <SimplePremiumAlert
        visible={showPremiumAlert}
        onClose={() => setShowPremiumAlert(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  invitationLimit: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 2,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonContent: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  sendBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  selectionSummary: {
    backgroundColor: '#F5F3FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storyCard: {
    width: 80,
    alignItems: 'center',
    marginBottom: 8,
  },
  storyCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 6,
    position: 'relative',
  },
  storyCircleSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 3,
  },
  storyPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  storyCheckmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  storyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
  },
  storyAge: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  storyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  storyLocationText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  storyDistance: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filtre Modal Styles (Keşfet sayfası ile aynı)
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backToBasicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToBasicButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  filterDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  advancedFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  advancedFilterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedFilterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  filterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cityDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cityDisplayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  editCityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  editCityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  cityEditContainer: {
    gap: 16,
  },
  citySelectGroup: {
    gap: 8,
  },
  citySelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  dropdownList: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemActive: {
    backgroundColor: '#f3e8ff',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  cityEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cityEditCancel: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cityEditCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  cityEditDone: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cityEditDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  ageSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sliderMinMax: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    width: 30,
    textAlign: 'center',
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
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    top: -7,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ageControl: {
    flex: 1,
  },
  ageControlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  ageControlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageControlValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 35,
    textAlign: 'center',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  genderButtonTextActive: {
    color: 'white',
  },
  filterModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  filterClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterClearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
