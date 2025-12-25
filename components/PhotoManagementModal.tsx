import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { X, Camera as CameraIcon, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AppIconLoader } from './AppIconLoader';
// Platform-specific haptics import
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (e) {
    console.warn('expo-haptics not available');
  }
}


interface Photo {
  id: string;
  photo_url: string;
  order: number;
}

interface PhotoManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onPhotosUpdated: () => void;
}

export default function PhotoManagementModal({
  visible,
  onClose,
  userId,
  onPhotosUpdated,
}: PhotoManagementModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<any>(null);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web' && Haptics) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        console.warn('Haptics not available');
      }
    }
  };

  useEffect(() => {
    if (visible) {
      loadPhotos();
    }
  }, [visible]);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('profile_id', userId)
        .order('order');

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleFileChange = (event: any) => {
    const file = event.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        if (result) {
          triggerHaptic();
          await addPhoto(result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const addFromCamera = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.6, // Daha düşük kalite (manipulator olmadığı için)
        aspect: [3, 4],
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        triggerHaptic();
        await addPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Hata', `Fotoğraf çekilemedi: ${error.message}`);
    }
  };

  const addFromGallery = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6, // Daha düşük kalite (manipulator olmadığı için)
        aspect: [3, 4],
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        triggerHaptic();
        await addPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      Alert.alert('Hata', `Fotoğraf seçilemedi: ${error.message}`);
    }
  };

  const resizeImage = async (uri: string): Promise<string> => {
    // expo-image-manipulator olmadan basit optimizasyon
    return uri;
  };

  const addPhoto = async (uri: string) => {
    if (photos.length >= 6) {
      Alert.alert('Limit', 'En fazla 6 fotoğraf ekleyebilirsiniz');
      return;
    }

    try {
      setLoading(true);
      
      let uploadedUrl = uri;

      // Eğer local file ise (file:// ile başlıyorsa) veya data URL ise, Supabase storage'a yükle
      if (uri.startsWith('file://') || uri.startsWith('data:')) {
        // Önce resmi resize et (şimdilik atlanıyor)
        const resizedUri = await resizeImage(uri);
        
        // Dosya adı oluştur
        const timestamp = Date.now();
        const fileName = `${userId}/${timestamp}_${photos.length}.jpg`;
        const filePath = `profile-photos/${fileName}`;
        
        // Fetch ile ArrayBuffer al (hem web hem mobile çalışır)
        const response = await fetch(resizedUri);
        const arrayBuffer = await response.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        
        // Supabase storage'a yükle
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, fileData, {
            contentType: 'image/jpeg',
            upsert: false,
            cacheControl: '3600', // 1 saat cache
          });

        if (uploadError) throw uploadError;

        // Public URL'i al
        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);
        
        uploadedUrl = urlData.publicUrl;
      }

      // Database'e kaydet
      const { error } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: userId,
          photo_url: uploadedUrl,
          order: photos.length,
        });

      if (error) throw error;

      // İlk fotoğraf ise profil fotoğrafı olarak da kaydet
      if (photos.length === 0) {
        await supabase
          .from('profiles')
          .update({ profile_photo: uploadedUrl })
          .eq('id', userId);
      }

      await loadPhotos();
      onPhotosUpdated();
      Alert.alert('Başarılı', 'Fotoğraf eklendi');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async (photoId: string, index: number) => {
    triggerHaptic();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profile_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // İlk fotoğraf silinirse, ikinci fotoğrafı profil fotoğrafı yap
      if (index === 0 && photos.length > 1) {
        await supabase
          .from('profiles')
          .update({ profile_photo: photos[1].photo_url })
          .eq('id', userId);
      }

      await loadPhotos();
      onPhotosUpdated();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const setAsProfilePhoto = async (photo: Photo, index: number) => {
    if (index === 0) return; // Zaten profil fotoğrafı
    
    triggerHaptic();
    try {
      setLoading(true);
      
      // Profil fotoğrafını güncelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ profile_photo: photo.photo_url })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Sıraları değiştir: Seçilen fotoğrafı başa al
      const updatedPhotos = [...photos];
      const [selectedPhoto] = updatedPhotos.splice(index, 1);
      updatedPhotos.unshift(selectedPhoto);

      // Yeni sıraları database'e kaydet
      const updates = updatedPhotos.map((p, i) => ({
        id: p.id,
        order: i,
      }));

      for (const update of updates) {
        await supabase
          .from('profile_photos')
          .update({ order: update.order })
          .eq('id', update.id);
      }

      await loadPhotos();
      onPhotosUpdated();
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    triggerHaptic();
    onPhotosUpdated();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fotoğrafları Yönet</Text>
            <TouchableOpacity 
              onPress={() => {
                triggerHaptic();
                onClose();
              }}
              style={styles.closeIcon}
            >
              <X size={24} color="#6B7280" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              En az 2 fotoğraf gerekli ({photos.length}/6)
            </Text>

            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={[styles.addPhotoCard, loading && styles.disabledCard]}
                onPress={addFromCamera}
                disabled={loading || photos.length >= 6}
                activeOpacity={0.7}
              >
                <View style={styles.addPhotoContent}>
                  <View style={styles.addPhotoIconContainer}>
                    {loading ? (
                      <AppIconLoader size={28} />
                    ) : (
                      <CameraIcon size={28} color="#8B5CF6" strokeWidth={2} />
                    )}
                  </View>
                  <Text style={styles.addPhotoText}>
                    {loading ? 'Yükleniyor...' : 'Kamera'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addPhotoCard, loading && styles.disabledCard]}
                onPress={addFromGallery}
                disabled={loading || photos.length >= 6}
                activeOpacity={0.7}
              >
                <View style={styles.addPhotoContent}>
                  <View style={styles.addPhotoIconContainer}>
                    {loading ? (
                      <AppIconLoader size={28} />
                    ) : (
                      <ImageIcon size={28} color="#8B5CF6" strokeWidth={2} />
                    )}
                  </View>
                  <Text style={styles.addPhotoText}>
                    {loading ? 'Yükleniyor...' : 'Galeri'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosScrollContainer}
                contentContainerStyle={styles.photosScrollContent}
              >
                {photos.map((photo, index) => (
                  <View key={photo.id} style={styles.photoContainer}>
                    <TouchableOpacity
                      style={styles.photoThumbnail}
                      onPress={() => setAsProfilePhoto(photo, index)}
                      activeOpacity={0.9}
                      disabled={index === 0}
                    >
                      <Image 
                        source={{ uri: photo.photo_url }} 
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                        loadingIndicatorSource={require('@/assets/images/puzzle-iconnew.png')}
                      />
                      {index === 0 && (
                        <View style={styles.primaryBadgeSmall}>
                          <Text style={styles.primaryTextSmall}>Ana</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeButtonSmall}
                        onPress={() => deletePhoto(photo.id, index)}
                        activeOpacity={0.7}
                      >
                        <X size={14} color="#FFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {index !== 0 && (
                      <TouchableOpacity
                        style={styles.setProfileButton}
                        onPress={() => setAsProfilePhoto(photo, index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.setProfileText}>Profil Yap</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                • "Profil Yap" butonuna basarak profil fotoğrafınızı değiştirebilirsiniz
              </Text>
              <Text style={styles.infoText}>
                • En fazla 6 fotoğraf ekleyebilirsiniz
              </Text>
              <Text style={styles.infoText}>
                • Fotoğrafları silmek için X butonuna basın
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
    marginBottom: 20,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  addPhotoCard: {
    width: '48%',
    height: 120,
    backgroundColor: '#F9F5FF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderStyle: 'solid',
  },
  addPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  addPhotoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  disabledCard: {
    opacity: 0.6,
  },
  photosScrollContainer: {
    maxHeight: 160,
    marginBottom: 24,
  },
  photosScrollContent: {
    gap: 12,
    paddingRight: 12,
  },
  photoContainer: {
    gap: 8,
  },
  photoThumbnail: {
    width: 90,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  setProfileButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  setProfileText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadgeSmall: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  removeButtonSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
});
