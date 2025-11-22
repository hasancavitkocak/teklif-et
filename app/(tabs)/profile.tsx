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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, MapPin, Heart, Crown, LogOut, X, Camera, Zap } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import PhotoManagementModal from '@/components/PhotoManagementModal';

interface Profile {
  name: string;
  birth_date: string;
  gender: string;
  city: string;
  smoking: string;
  drinking: string;
  profile_photo: string;
  is_premium: boolean;
  daily_proposals_sent: number;
  daily_super_likes_used: number;
}

export default function ProfileScreen() {
  const { user, signOut, isPremium } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [myProposals, setMyProposals] = useState<number>(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [photoManagementVisible, setPhotoManagementVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setEditName(profileData.name);
        setEditCity(profileData.city);
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
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Çıkış Yap', 'Çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/auth/welcome');
          } catch (error: any) {
            Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
          }
        },
      },
    ]);
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editName,
          city: editCity,
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Profiliniz güncellendi');
      setSettingsVisible(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
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
              {profile.is_premium ? '∞' : Math.max(0, 1 - (profile.daily_super_likes_used || 0))}
            </Text>
            <Text style={styles.statLabel}>Super Like</Text>
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
              <Text style={styles.lifestyleLabel}>Sigara</Text>
              <Text style={styles.lifestyleValue}>
                {profile.smoking === 'never' ? 'İçmiyor' : profile.smoking === 'occasionally' ? 'Ara sıra' : profile.smoking === 'socially' ? 'Sosyal' : 'İçiyor'}
              </Text>
            </View>
            <View style={styles.lifestyleItem}>
              <Text style={styles.lifestyleLabel}>Alkol</Text>
              <Text style={styles.lifestyleValue}>
                {profile.drinking === 'never' ? 'Kullanmıyor' : profile.drinking === 'occasionally' ? 'Ara sıra' : profile.drinking === 'socially' ? 'Sosyal' : 'Kullanıyor'}
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
              <Text style={styles.modalTitle}>Profil Ayarları</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>İsim</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="İsminiz"
              />

              <Text style={styles.label}>Şehir</Text>
              <TextInput
                style={styles.input}
                value={editCity}
                onChangeText={setEditCity}
                placeholder="Şehir"
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    maxHeight: '80%',
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
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  saveButton: {
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
  saveButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
