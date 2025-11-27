import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Heart, X } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  name: string;
  birth_date: string;
  gender: string;
  city: string;
  bio?: string;
  profile_photo: string;
  photos?: string[];
  occupation?: string;
  education?: string;
  height?: number;
  religion?: string;
  interests: Array<{ id: string; name: string }>;
  lifestyle?: {
    drinking?: string;
    smoking?: string;
    exercise?: string;
  };
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          birth_date,
          gender,
          city,
          bio,
          profile_photo,
          photos,
          occupation,
          education,
          height,
          drinking,
          smoking,
          exercise,
          religion
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // İlgi alanlarını al
      const { data: interestsData } = await supabase
        .from('user_interests')
        .select('interest:interests(id, name)')
        .eq('user_id', id);

      // Fotoğrafları profile_photos tablosundan al
      const { data: photosData } = await supabase
        .from('profile_photos')
        .select('photo_url')
        .eq('profile_id', id)
        .order('order', { ascending: true });

      // Tüm fotoğrafları birleştir (profile_photo + photos array + profile_photos table)
      let allPhotos: string[] = [];
      
      // Önce profile_photo ekle
      if (profileData.profile_photo) {
        allPhotos.push(profileData.profile_photo);
      }
      
      // Sonra photos array'den ekle (eğer varsa)
      if (profileData.photos && Array.isArray(profileData.photos)) {
        allPhotos = [...allPhotos, ...profileData.photos];
      }
      
      // Son olarak profile_photos tablosundan ekle
      if (photosData && photosData.length > 0) {
        const tablePhotos = photosData.map((p: any) => p.photo_url);
        allPhotos = [...allPhotos, ...tablePhotos];
      }

      // Tekrar edenleri kaldır
      allPhotos = Array.from(new Set(allPhotos));
      
      // Local file path'leri filtrele (sadece http/https URL'leri göster)
      allPhotos = allPhotos.filter(url => url.startsWith('http://') || url.startsWith('https://'));

      const interests = interestsData?.map((item: any) => item.interest).filter(Boolean) || [];

      setProfile({
        ...profileData,
        photos: allPhotos.length > 0 ? allPhotos : [profileData.profile_photo],
        interests: interests,
        lifestyle: {
          drinking: profileData.drinking,
          smoking: profileData.smoking,
          exercise: profileData.exercise,
        },
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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

  const translateValue = (key: string, value: string) => {
    const translations: Record<string, Record<string, string>> = {
      drinking: {
        never: 'İçmem',
        occasionally: 'Ara sıra',
        socially: 'Sosyal ortamlarda',
        regularly: 'Düzenli',
      },
      smoking: {
        never: 'İçmem',
        occasionally: 'Ara sıra',
        socially: 'Sosyal ortamlarda',
        regularly: 'Düzenli',
      },
      exercise: {
        never: 'Yapmam',
        sometimes: 'Bazen',
        often: 'Sık sık',
        daily: 'Her gün',
      },
    };
    return translations[key]?.[value] || value;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profil bulunamadı</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <TouchableOpacity style={styles.backButtonTop} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Photos Carousel */}
        <FlatList
          ref={carouselRef}
          data={profile.photos && profile.photos.length > 0 ? profile.photos : [profile.profile_photo]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentPhotoIndex(index);
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSelectedPhotoIndex(index)}
            >
              <Image source={{ uri: item }} style={styles.profilePhoto} />
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => `photo-${index}`}
        />
        
        {/* Photo Indicators */}
        {profile.photos && profile.photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {profile.photos.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.indicator,
                  currentPhotoIndex === index && styles.indicatorActive
                ]} 
              />
            ))}
          </View>
        )}

        {/* Full Screen Photo Modal */}
        <Modal
          visible={selectedPhotoIndex !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPhotoIndex(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedPhotoIndex(null)}
            >
              <X size={28} color="#FFF" />
            </TouchableOpacity>
            
            {/* Photo Counter */}
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {modalPhotoIndex + 1} / {profile.photos && profile.photos.length > 0 ? profile.photos.length : 1}
              </Text>
            </View>
            
            <FlatList
              data={profile.photos && profile.photos.length > 0 ? profile.photos : [profile.profile_photo]}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={selectedPhotoIndex || 0}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setModalPhotoIndex(index);
              }}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={styles.modalPhotoContainer}>
                  <Image 
                    source={{ uri: item }} 
                    style={styles.modalPhoto}
                    resizeMode="contain"
                  />
                </View>
              )}
              keyExtractor={(_, index) => `modal-photo-${index}`}
            />
          </View>
        </Modal>

        {/* Name, Age, Location */}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {profile.name}, {calculateAge(profile.birth_date)}
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color="#8B5CF6" />
            <Text style={styles.locationText}>{profile.city}</Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Info Grid */}
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            {profile.occupation && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Meslek</Text>
                <Text style={styles.infoValue}>{profile.occupation}</Text>
              </View>
            )}
            {profile.education && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Eğitim</Text>
                <Text style={styles.infoValue}>{profile.education}</Text>
              </View>
            )}
            {profile.height && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Boy</Text>
                <Text style={styles.infoValue}>{profile.height} cm</Text>
              </View>
            )}
            {profile.religion && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Din</Text>
                <Text style={styles.infoValue}>{profile.religion}</Text>
              </View>
            )}
            {profile.lifestyle?.drinking && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>İçki</Text>
                <Text style={styles.infoValue}>{translateValue('drinking', profile.lifestyle.drinking)}</Text>
              </View>
            )}
            {profile.lifestyle?.smoking && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Sigara</Text>
                <Text style={styles.infoValue}>{translateValue('smoking', profile.lifestyle.smoking)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Interests */}
        {profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlgi Alanları</Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest) => (
                <View key={interest.id} style={styles.interestChip}>
                  <Heart size={14} color="#8B5CF6" />
                  <Text style={styles.interestText}>{interest.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: width,
    height: width * 1.1,
    backgroundColor: '#F3F4F6',
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  indicatorActive: {
    backgroundColor: '#8B5CF6',
    width: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalPhotoContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPhoto: {
    width: width,
    height: '100%',
  },
  photoCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  photoCounterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFF',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  infoGrid: {
    gap: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
});
