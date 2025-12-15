import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, MapPin, Crown, LogOut, X, Camera, Trash2, PauseCircle, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import PhotoManagementModal from '@/components/PhotoManagementModal';
import FreezeAccountModal from '@/components/FreezeAccountModal';
import AccountFrozenSuccessModal from '@/components/AccountFrozenSuccessModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import SignOutModal from '@/components/SignOutModal';
import { PROVINCES } from '@/constants/cities';
import * as Location from 'expo-location';
import { getDistrictFromNeighborhood } from '@/constants/neighborhoodToDistrict';

import { usePushNotifications } from '@/contexts/PushNotificationContext';
import * as Device from 'expo-device';

interface Profile {
  name: string;
  birth_date: string;
  gender: string;
  city: string;
  latitude?: number;
  longitude?: number;
  smoking: string;
  drinking: string;
  profile_photo: string;
  is_premium: boolean;
  daily_proposals_sent: number;
  daily_super_likes_used: number;
  daily_invitations_sent: number;
  allow_invitations: boolean;
  phone: string;
}

export default function ProfileScreen() {
  const { user, signOut, isPremium, updateLocationManually, currentCity, updateCityFromSettings } = useAuth();
  const { permissionStatus, checkPermissionStatus, registerForPushNotifications } = usePushNotifications();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [myProposals, setMyProposals] = useState<number>(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [photoManagementVisible, setPhotoManagementVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSmoking, setEditSmoking] = useState('');
  const [editDrinking, setEditDrinking] = useState('');
  const [editNotificationMessages, setEditNotificationMessages] = useState(true);
  const [editNotificationMatches, setEditNotificationMatches] = useState(true);
  const [editNotificationProposals, setEditNotificationProposals] = useState(true);
  const [editNotificationMarketing, setEditNotificationMarketing] = useState(false);
  const [editAllowInvitations, setEditAllowInvitations] = useState(true);
  const [editingCity, setEditingCity] = useState(false);
  const [showPremiumAlert, setShowPremiumAlert] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showFreezeSuccessModal, setShowFreezeSuccessModal] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [remainingSuperLikes, setRemainingSuperLikes] = useState<number>(0);
  const [remainingInvitations, setRemainingInvitations] = useState<number>(0);

  useEffect(() => {
    loadProfile();
    // Premium olmayan kullanıcılar için otomatik konum güncelle
    if (!isPremium) {
      updateCurrentLocation();
    }
  }, [isPremium]);

  // AuthContext'teki currentCity değiştiğinde editCity'yi de güncelle
  useEffect(() => {
    if (currentCity && currentCity !== editCity) {
      console.log('🔄 AuthContext\'ten gelen yeni şehir ayarlara uygulanıyor:', currentCity);
      setEditCity(currentCity);
    }
  }, [currentCity]);

  const updateCurrentLocation = async (forceUpdate = false) => {
    if (!user?.id || isUpdatingLocation) return;
    
    // Premium kullanıcılar için sadece manuel güncellemeye izin ver
    if (isPremium && !forceUpdate) {
      console.log('👑 Premium kullanıcı, otomatik konum güncellemesi atlanıyor');
      return;
    }
    
    setIsUpdatingLocation(true);
    try {
      console.log('🔄 Profil sayfasında konum güncelleniyor...', forceUpdate ? '(Manuel)' : '(Otomatik)');
      
      // Konum izni kontrol et
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('❌ Konum izni reddedildi');
          setIsUpdatingLocation(false);
          return;
        }
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('📍 Yeni konum alındı:', { latitude, longitude });

      // Reverse geocoding ile şehir bilgisini al
      const geocodeResults = await Location.reverseGeocodeAsync({ 
        latitude, 
        longitude 
      });
      
      if (geocodeResults && geocodeResults.length > 0) {
        const geocode = geocodeResults[0];
        
        // Debug: Geocode sonucunu logla
        console.log('🗺️ Profil sayfası geocode:', {
          district: geocode.district,
          subregion: geocode.subregion,
          city: geocode.city,
          region: geocode.region
        });
        
        // İlçe bilgisini akıllı şekilde belirle
        let cityName = '';
        let districtName = '';
        let regionName = geocode.region || '';
        
        // Önce subregion'ı kontrol et (daha doğru ilçe bilgisi)
        if (geocode.subregion) {
          districtName = getDistrictFromNeighborhood(geocode.subregion.trim());
          console.log('🔄 Profil Subregion mapping:', geocode.subregion, '->', districtName);
        }
        // Sonra district alanını kontrol et ve mapping uygula
        else if (geocode.district) {
          districtName = getDistrictFromNeighborhood(geocode.district);
          console.log('🔄 Profil District mapping:', geocode.district, '->', districtName);
        }
        // Son çare olarak city'yi kullan
        else if (geocode.city) {
          districtName = geocode.city;
          console.log('🔄 Profil City kullanıldı:', districtName);
        }
        
        // Final şehir adını oluştur
        if (districtName && regionName) {
          cityName = `${districtName}, ${regionName}`;
          console.log('📍 Profil Final konum:', cityName);
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

          if (error) {
            console.error('❌ Profil güncelleme hatası:', error);
          } else {
            console.log('✅ Profil sayfasında konum güncellendi:', cityName);
            // Profili yeniden yükle
            loadProfile();
          }
        }
      }
    } catch (error) {
      console.error('❌ Konum güncelleme hatası:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        // Telefon numarasını user metadata'dan al
        const phoneNumber = user?.user_metadata?.phone || user?.phone || '';
        setProfile({ ...profileData, phone: phoneNumber });
        setEditName(profileData.name);
        setEditCity(profileData.city);
        setEditSmoking(profileData.smoking);
        setEditDrinking(profileData.drinking);
        setEditNotificationMessages(profileData.notification_messages ?? true);
        setEditNotificationMatches(profileData.notification_matches ?? true);
        setEditNotificationProposals(profileData.notification_proposals ?? true);
        setEditNotificationMarketing(profileData.notification_marketing ?? false);
        setEditAllowInvitations(profileData.allow_invitations ?? true);
      }

      const { data: interestsData } = await supabase
        .from('user_interests')
        .select('interest:interests(name)')
        .eq('user_id', user?.id);

      if (interestsData) {
        setInterests(interestsData.map((i: any) => i.interest.name));
      }

      const { data: photosData } = await supabase
        .from('profile_photos')
        .select('photo_url')
        .eq('profile_id', user?.id)
        .order('order');

      if (photosData) {
        setPhotos(photosData.map(p => p.photo_url));
      }

      const { count } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user?.id)
        .eq('status', 'active');

      setMyProposals(count || 0);

      // Kalan super like hakkını al
      if (user?.id) {
        const { data: remainingLikes } = await supabase.rpc('get_remaining_super_likes', { 
          p_user_id: user.id 
        });
        setRemainingSuperLikes(remainingLikes || 0);

        // Kalan davet hakkını al
        const { data: remainingInvites } = await supabase.rpc('get_remaining_invitations', { 
          p_user_id: user.id 
        });
        setRemainingInvitations(remainingInvites || 0);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      setShowSignOutModal(false);
      router.replace('/auth/welcome');
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert('Hata', error.message || 'Çıkış yapılırken bir hata oluştu');
    } finally {
      setSignOutLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Şehir değişikliği varsa AuthContext üzerinden güncelle
      let cityUpdateSuccess = true;
      if (editCity !== profile?.city) {
        console.log('🔄 Şehir değişti, AuthContext üzerinden güncelleniyor:', editCity);
        cityUpdateSuccess = await updateCityFromSettings(editCity);
        if (!cityUpdateSuccess) {
          Alert.alert('Hata', 'Şehir bilgisi güncellenirken bir hata oluştu');
          return;
        }
      }

      // Diğer profil bilgilerini güncelle (şehir hariç, çünkü AuthContext'te güncellendi)
      const updateData: any = {
        name: editName,
        smoking: editSmoking,
        drinking: editDrinking,
        notification_messages: editNotificationMessages,
        notification_matches: editNotificationMatches,
        notification_proposals: editNotificationProposals,
        notification_marketing: editNotificationMarketing,
        allow_invitations: editAllowInvitations,
      };

      // Şehir değişmediyse normal güncelleme
      if (editCity === profile?.city) {
        updateData.city = editCity;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Profiliniz güncellendi');
      setSettingsVisible(false);
      loadProfile();
    } catch (error: any) {
      console.error('Save settings error:', error);
      Alert.alert('Hata', error.message);
    }
  };

  const handleFreezeAccount = () => {
    setShowFreezeModal(true);
  };

  const handleConfirmFreeze = async () => {
    setFreezeLoading(true);
    
    try {
      console.log('🥶 Hesap dondurma işlemi başlatılıyor...');
      
      // Hesabı dondur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Aktif teklifleri pasif yap
      const { error: proposalsError } = await supabase
        .from('proposals')
        .update({ status: 'frozen' })
        .eq('creator_id', user?.id)
        .eq('status', 'active');

      if (proposalsError) {
        console.warn('⚠️ Teklifler dondurulurken hata:', proposalsError);
      }

      // Kullanıcının aktif match'lerini soft delete et (hesap dondurunca)
      const { error: matchesError } = await supabase
        .from('matches')
        .update({ deleted_by: user?.id })
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .is('deleted_by', null);

      if (matchesError) {
        console.warn('⚠️ Eşleşmeler dondurulurken hata:', matchesError);
      }

      console.log('✅ Hesap başarıyla donduruldu');
      
      // Modalları kapat ve başarı modalını göster
      setShowFreezeModal(false);
      setSettingsVisible(false);
      setFreezeLoading(false);
      
      // Kısa bir gecikme ile başarı modalını göster
      setTimeout(() => {
        setShowFreezeSuccessModal(true);
      }, 300);
      
    } catch (error: any) {
      console.error('❌ Hesap dondurma hatası:', error);
      setFreezeLoading(false);
      setShowFreezeModal(false);
      Alert.alert('Hata', 'Hesap dondurulurken bir hata oluştu: ' + error.message);
    }
  };

  const handleFreezeSuccessClose = async () => {
    setShowFreezeSuccessModal(false);
    
    // Doğrudan çıkış yap (onay sormadan)
    try {
      await signOut();
      console.log('✅ Kullanıcı çıkış yaptırıldı');
      
      // Login ekranına yönlendir
      router.replace('/auth/welcome');
    } catch (signOutError) {
      console.error('❌ Çıkış hatası:', signOutError);
      // Hata olsa bile yönlendir
      router.replace('/auth/welcome');
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    
    try {
      console.log('🗑️ Hesap silme işlemi başlatılıyor...');
      
      // 1. Kullanıcı ilgi alanlarını sil
      const { error: interestsError } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user?.id);

      if (interestsError) {
        console.warn('⚠️ İlgi alanları silinirken hata:', interestsError);
      }

      // 2. Profil fotoğraflarını sil
      const { error: photosError } = await supabase
        .from('profile_photos')
        .delete()
        .eq('profile_id', user?.id);

      if (photosError) {
        console.warn('⚠️ Fotoğraflar silinirken hata:', photosError);
      }

      // 3. Mesajları sil
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', user?.id);

      if (messagesError) {
        console.warn('⚠️ Mesajlar silinirken hata:', messagesError);
      }

      // 4. Teklifleri sil
      const { error: proposalsError } = await supabase
        .from('proposals')
        .delete()
        .eq('creator_id', user?.id);

      if (proposalsError) {
        console.warn('⚠️ Teklifler silinirken hata:', proposalsError);
      }

      // 5. Teklif yanıtlarını sil
      const { error: responsesError } = await supabase
        .from('proposal_responses')
        .delete()
        .eq('user_id', user?.id);

      if (responsesError) {
        console.warn('⚠️ Teklif yanıtları silinirken hata:', responsesError);
      }

      // 6. Eşleşmeleri sil
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (matchesError) {
        console.warn('⚠️ Eşleşmeler silinirken hata:', matchesError);
      }

      // 7. Bildirimleri sil
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (notificationsError) {
        console.warn('⚠️ Bildirimler silinirken hata:', notificationsError);
      }

      // 8. Profili sil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) throw profileError;

      console.log('✅ Hesap başarıyla silindi');

      // 9. Auth kullanıcısını sil (Supabase Auth)
      try {
        await signOut();
      } catch (authError) {
        console.warn('⚠️ Auth çıkış hatası:', authError);
      }

      // Modal'ı kapat ve yönlendir
      setShowDeleteModal(false);
      setDeleteLoading(false);
      
      Alert.alert(
        'Hesap Silindi',
        'Hesabınız ve tüm verileriniz kalıcı olarak silindi.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              router.replace('/auth/welcome');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Hesap silme hatası:', error);
      setDeleteLoading(false);
      setShowDeleteModal(false);
      Alert.alert(
        'Hata', 
        'Hesap silinirken bir hata oluştu: ' + error.message + '\n\nLütfen tekrar deneyin veya destek ekibiyle iletişime geçin.'
      );
    }
  };

  const handleChangeLocation = () => {
    if (!isPremium) {
      setShowPremiumAlert(true);
      return;
    }
    setEditingCity(true);
  };

  const handleCitySelectionComplete = () => {
    if (selectedProvince && selectedDistrict) {
      const provinceName = PROVINCES.find(p => p.id === selectedProvince)?.name;
      setEditCity(`${selectedDistrict}, ${provinceName}`);
      setEditingCity(false);
      setShowProvinceDropdown(false);
      setShowDistrictDropdown(false);
    }
  };

  const handleCancelCityEdit = () => {
    setEditingCity(false);
    setShowProvinceDropdown(false);
    setShowDistrictDropdown(false);
    setSelectedProvince('');
    setSelectedDistrict('');
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

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
          <Settings size={22} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section - Clean White */}
        <View style={styles.heroSection}>
          <TouchableOpacity onPress={() => setPhotoManagementVisible(true)} style={styles.profileImageContainer}>
            <Image source={{ uri: profile.profile_photo }} style={styles.profileImageLarge} />
            <View style={styles.editPhotoButtonLarge}>
              <Camera size={24} color="#FFF" />
            </View>
            {isPremium && (
              <View style={styles.premiumBadgeLarge}>
                <Crown size={20} color="#FFF" fill="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.profileNameLarge}>
            {profile.name}, {calculateAge(profile.birth_date)}
          </Text>
          
          <View style={styles.locationRowLarge}>
            <MapPin size={18} color="#8B5CF6" />
            <Text style={styles.locationTextLarge}>{profile.city}</Text>
            <TouchableOpacity 
              onPress={async () => {
                console.log('🔄 Manuel konum güncelleme butonu tıklandı');
                setIsUpdatingLocation(true);
                const result = await updateLocationManually();
                console.log('📍 Manuel güncelleme sonucu:', result);
                if (result.success) {
                  console.log('✅ Profil yeniden yükleniyor...');
                  await loadProfile(); // Profili yeniden yükle
                  console.log('✅ Profil yeniden yüklendi');
                  
                  // Eğer yeni şehir bilgisi varsa, direkt olarak da güncelle
                  if (result.city && profile) {
                    console.log('🏙️ Şehir bilgisi direkt güncelleniyor:', result.city);
                    setProfile({ ...profile, city: result.city });
                    setEditCity(result.city); // Ayarlar modalındaki şehir bilgisini de güncelle
                  }
                }
                setIsUpdatingLocation(false);
              }}
              disabled={isUpdatingLocation}
              style={[styles.refreshLocationButton, isUpdatingLocation && styles.refreshLocationButtonDisabled]}
            >
              <RefreshCw 
                size={14} 
                color={isUpdatingLocation ? "#9CA3AF" : "#8B5CF6"} 
                style={isUpdatingLocation ? styles.spinning : undefined}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section - Minimal */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{myProposals}</Text>
            <Text style={styles.statLabel}>Aktif Teklif</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {profile.is_premium ? '∞' : Math.max(0, 5 - (profile.daily_proposals_sent || 0))}
            </Text>
            <Text style={styles.statLabel}>Kalan</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {remainingSuperLikes}
            </Text>
            <Text style={styles.statLabel}>Super Like</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {remainingInvitations === 999 ? '∞' : remainingInvitations}
            </Text>
            <Text style={styles.statLabel}>Davet</Text>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotoğraflar</Text>
          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosGrid}>
                {photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photoItem} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyPhotos}>
              <Text style={styles.emptyText}>Henüz fotoğraf eklenmemiş</Text>
            </View>
          )}
        </View>

        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlgi Alanları</Text>
            <View style={styles.interestsContainer}>
              {interests.map((interest, index) => (
                <View key={index} style={styles.interestChip}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkımda</Text>
          <View style={styles.lifestyleContainer}>
            <View style={styles.lifestyleItem}>
              <Text style={styles.lifestyleLabel}>Cinsiyet</Text>
              <Text style={styles.lifestyleValue}>
                {profile.gender === 'male' ? 'Erkek' : profile.gender === 'female' ? 'Kadın' : profile.gender === 'prefer_not_to_say' ? 'Belirtmek İstemiyorum' : 'Belirtilmemiş'}
              </Text>
            </View>
            <View style={styles.lifestyleItem}>
              <Text style={styles.lifestyleLabel}>Telefon</Text>
              <Text style={styles.lifestyleValue}>{profile.phone}</Text>
            </View>
            <View style={styles.lifestyleItem}>
              <Text style={styles.lifestyleLabel}>Sigara</Text>
              <Text style={styles.lifestyleValue}>
                {profile.smoking === 'regularly' ? 'Evet' : profile.smoking === 'occasionally' ? 'Bazen' : 'Hayır'}
              </Text>
            </View>
            <View style={styles.lifestyleItem}>
              <Text style={styles.lifestyleLabel}>Alkol</Text>
              <Text style={styles.lifestyleValue}>
                {profile.drinking === 'regularly' ? 'Evet' : profile.drinking === 'occasionally' ? 'Bazen' : 'Hayır'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <PhotoManagementModal
        visible={photoManagementVisible}
        onClose={() => setPhotoManagementVisible(false)}
        userId={user?.id || ''}
        onPhotosUpdated={loadProfile}
      />

      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ayarlar</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.closeIcon}>
                <X size={24} color="#6B7280" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Profil Bilgileri */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Profil Bilgileri</Text>
                
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>İsim</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="İsminiz"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Şehir</Text>
                  
                  {!editingCity ? (
                    <View style={styles.cityDisplayContainer}>
                      <View style={styles.cityDisplay}>
                        <MapPin size={18} color="#8B5CF6" />
                        <Text style={styles.cityDisplayText}>
                          {selectedProvince && selectedDistrict
                            ? `${selectedDistrict}, ${PROVINCES.find(p => p.id === selectedProvince)?.name}`
                            : editCity || 'Şehir seçilmedi'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editCityButton}
                        onPress={handleChangeLocation}
                      >
                        <Crown size={14} color="#F59E0B" fill="#F59E0B" />
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
                          onPress={handleCancelCityEdit}
                        >
                          <Text style={styles.cityEditCancelText}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.cityEditConfirm,
                            (!selectedProvince || !selectedDistrict) && styles.cityEditConfirmDisabled,
                          ]}
                          onPress={handleCitySelectionComplete}
                          disabled={!selectedProvince || !selectedDistrict}
                        >
                          <Text style={styles.cityEditConfirmText}>Tamam</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Yaşam Tarzı */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Yaşam Tarzı</Text>
                
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Sigara içiyor musunuz?</Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'regularly', label: 'Evet' },
                      { value: 'occasionally', label: 'Bazen' },
                      { value: 'never', label: 'Hayır' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionChip,
                          editSmoking === option.value && styles.optionChipSelected,
                        ]}
                        onPress={() => setEditSmoking(option.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            editSmoking === option.value && styles.optionChipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Alkol kullanıyor musunuz?</Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'regularly', label: 'Evet' },
                      { value: 'occasionally', label: 'Bazen' },
                      { value: 'never', label: 'Hayır' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionChip,
                          editDrinking === option.value && styles.optionChipSelected,
                        ]}
                        onPress={() => setEditDrinking(option.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            editDrinking === option.value && styles.optionChipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Bildirim Ayarları */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Bildirim Ayarları</Text>
                
                {/* Bildirim İzni Durumu */}
                <View style={styles.permissionStatus}>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>
                      Bildirim İzni: {
                        permissionStatus === 'granted' ? '✅ Verildi' : 
                        permissionStatus === 'denied' ? '❌ Reddedildi' :
                        permissionStatus === null ? '⏳ Kontrol ediliyor...' : '❓ Bilinmiyor'
                      }
                    </Text>
                    <Text style={styles.permissionSubtitle}>
                      {permissionStatus === 'granted' 
                        ? (__DEV__ ? 'Push bildirimler hazır (DEV modda log olarak görünür)' : 'Push bildirimler aktif')
                        : permissionStatus === 'denied' 
                        ? 'Cihaz ayarlarından izin verebilirsiniz'
                        : 'Bildirim almak için izin verin'}
                    </Text>
                  </View>
                  {permissionStatus !== 'granted' && (
                    <TouchableOpacity
                      style={styles.enablePermissionButton}
                      onPress={async () => {
                        const token = await registerForPushNotifications();
                        if (token) {
                          Alert.alert('Başarılı', 'Bildirim izni verildi!');
                          await checkPermissionStatus();
                        } else {
                          Alert.alert(
                            'İzin Gerekli',
                            'Bildirim izni için cihaz ayarlarına gidin.',
                            [
                              { text: 'İptal', style: 'cancel' },
                              { 
                                text: 'Ayarlara Git', 
                                onPress: () => {
                                  if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                  } else {
                                    Linking.openSettings();
                                  }
                                }
                              }
                            ]
                          );
                        }
                      }}
                    >
                      <Text style={styles.enablePermissionButtonText}>İzin Ver</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Yeni Mesajlar</Text>
                    <Text style={styles.notificationSubtitle}>Yeni mesaj geldiğinde bildirim al</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, editNotificationMessages && styles.toggleSwitchActive]}
                    onPress={() => setEditNotificationMessages(!editNotificationMessages)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toggleThumb, editNotificationMessages && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Yeni Eşleşmeler</Text>
                    <Text style={styles.notificationSubtitle}>Yeni eşleşme olduğunda bildirim al</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, editNotificationMatches && styles.toggleSwitchActive]}
                    onPress={() => setEditNotificationMatches(!editNotificationMatches)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toggleThumb, editNotificationMatches && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Teklif Bildirimleri</Text>
                    <Text style={styles.notificationSubtitle}>Teklif kabul/red edildiğinde bildirim al</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, editNotificationProposals && styles.toggleSwitchActive]}
                    onPress={() => setEditNotificationProposals(!editNotificationProposals)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toggleThumb, editNotificationProposals && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Pazarlama Bildirimleri</Text>
                    <Text style={styles.notificationSubtitle}>Özel teklifler ve kampanyalar</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, editNotificationMarketing && styles.toggleSwitchActive]}
                    onPress={() => setEditNotificationMarketing(!editNotificationMarketing)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toggleThumb, editNotificationMarketing && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>


              </View>

              {/* Gizlilik Ayarları */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Gizlilik Ayarları</Text>
                
                <View style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>Tekliflere Davet Edilebilirlik</Text>
                    <Text style={styles.notificationSubtitle}>Diğer kullanıcılar sizi tekliflerine davet edebilsin</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, editAllowInvitations && styles.toggleSwitchActive]}
                    onPress={() => setEditAllowInvitations(!editAllowInvitations)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.toggleThumb, editAllowInvitations && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hesap İşlemleri */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Hesap İşlemleri</Text>
                
                <TouchableOpacity style={styles.dangerButton} onPress={handleFreezeAccount}>
                  <PauseCircle size={20} color="#F59E0B" />
                  <Text style={styles.dangerButtonText}>Hesabı Dondur</Text>
                  <ChevronRight size={20} color="#F59E0B" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.dangerButton, styles.deleteButton]} onPress={handleDeleteAccount}>
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={[styles.dangerButtonText, styles.deleteButtonText]}>Hesabı Sil</Text>
                  <ChevronRight size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
                <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Premium Alert Modal */}
      <Modal visible={showPremiumAlert} animationType="fade" transparent>
        <View style={styles.premiumAlertOverlay}>
          <View style={styles.premiumAlertContent}>
            <View style={styles.premiumAlertIcon}>
              <Crown size={40} color="#F59E0B" fill="#F59E0B" />
            </View>
            
            <Text style={styles.premiumAlertTitle}>Premium Özellik</Text>
            <Text style={styles.premiumAlertMessage}>
              Şehir değiştirme özelliği sadece premium üyelerimize özeldir. Premium üye olarak konumunuzu dilediğiniz gibi değiştirebilirsiniz.
            </Text>

            <View style={styles.premiumAlertButtons}>
              <TouchableOpacity
                style={styles.premiumAlertCancelButton}
                onPress={() => setShowPremiumAlert(false)}
              >
                <Text style={styles.premiumAlertCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.premiumAlertUpgradeButton}
                onPress={() => {
                  setShowPremiumAlert(false);
                  router.push('/premium');
                }}
              >
                <Crown size={16} color="#FFF" fill="#FFF" />
                <Text style={styles.premiumAlertUpgradeText}>Premium Ol</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Freeze Account Modal */}
      <FreezeAccountModal
        visible={showFreezeModal}
        onClose={() => setShowFreezeModal(false)}
        onConfirm={handleConfirmFreeze}
        loading={freezeLoading}
      />

      {/* Freeze Success Modal */}
      <AccountFrozenSuccessModal
        visible={showFreezeSuccessModal}
        onClose={handleFreezeSuccessClose}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />

      {/* Sign Out Modal */}
      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={confirmSignOut}
        loading={signOutLoading}
      />

    </SafeAreaView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  settingsButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#F3E8FF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  editPhotoButtonLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumBadgeLarge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F59E0B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  profileNameLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  locationRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshLocationButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  refreshLocationButtonDisabled: {
    opacity: 0.5,
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  locationTextLarge: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoItem: {
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  lifestyleContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  lifestyleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lifestyleLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  lifestyleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyPhotos: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '90%',
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
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  closeIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  settingInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
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
    color: '#8B5CF6',
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
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownList: {
    maxHeight: 200,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#F3E8FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1F2937',
  },
  dropdownItemTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
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
  cityEditConfirm: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cityEditConfirmDisabled: {
    opacity: 0.4,
  },
  cityEditConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  optionChipSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
  },
  optionChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  optionChipTextSelected: {
    color: '#FFF',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  deleteButton: {
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#8B5CF6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  premiumAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  premiumAlertContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumAlertIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumAlertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumAlertMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  premiumAlertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  premiumAlertCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  premiumAlertCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  premiumAlertUpgradeButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumAlertUpgradeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  enablePermissionButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enablePermissionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
