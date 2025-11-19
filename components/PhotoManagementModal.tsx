import { useState, useEffect } from 'react';
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
import { X, Camera as CameraIcon, Image as ImageIcon, Trash2, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

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

  const addFromCamera = async () => {
    if (Platform.OS === 'web') {
      addPlaceholderPhoto();
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);

      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        await addPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Hata', `Fotoğraf çekilemedi: ${error.message}`);
    }
  };

  const addFromGallery = async () => {
    if (Platform.OS === 'web') {
      addPlaceholderPhoto();
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Gallery permission status:', status);

      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      console.log('Gallery result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        await addPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      Alert.alert('Hata', `Fotoğraf seçilemedi: ${error.message}`);
    }
  };

  const addPlaceholderPhoto = async () => {
    const placeholderPhotos = [
      'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
      'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
      'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg',
      'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg',
    ];
    const randomPhoto = placeholderPhotos[Math.floor(Math.random() * placeholderPhotos.length)];
    await addPhoto(randomPhoto);
  };

  const addPhoto = async (url: string) => {
    if (photos.length >= 6) {
      Alert.alert('Limit', 'En fazla 6 fotoğraf ekleyebilirsiniz');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: userId,
          photo_url: url,
          order: photos.length,
        });

      if (error) throw error;

      if (photos.length === 0) {
        await supabase
          .from('profiles')
          .update({ profile_photo: url })
          .eq('id', userId);
      }

      await loadPhotos();
      onPhotosUpdated();
      Alert.alert('Başarılı', 'Fotoğraf eklendi');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase
              .from('profile_photos')
              .delete()
              .eq('id', photoId);

            if (error) throw error;

            await loadPhotos();
            onPhotosUpdated();
            Alert.alert('Başarılı', 'Fotoğraf silindi');
          } catch (error: any) {
            Alert.alert('Hata', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const setAsProfilePhoto = async (photo: Photo) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo: photo.photo_url })
        .eq('id', userId);

      if (error) throw error;

      onPhotosUpdated();
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
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
            <Text style={styles.modalTitle}>Fotoğrafları Yönet</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Fotoğraflarınız ({photos.length}/6)
            </Text>

            <View style={styles.photosGrid}>
              {photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.photo_url }} style={styles.photoImage} />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.photoActionButton}
                      onPress={() => setAsProfilePhoto(photo)}
                    >
                      <Check size={16} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoActionButton, styles.deleteButton]}
                      onPress={() => deletePhoto(photo.id)}
                    >
                      <Trash2 size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {photos.length < 6 && (
                <View style={styles.addPhotoCard}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addFromCamera}
                    disabled={loading}
                  >
                    <CameraIcon size={28} color="#8B5CF6" />
                    <Text style={styles.addButtonText}>Kamera</Text>
                  </TouchableOpacity>
                  <View style={styles.addDivider} />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addFromGallery}
                    disabled={loading}
                  >
                    <ImageIcon size={28} color="#8B5CF6" />
                    <Text style={styles.addButtonText}>Galeri</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✓ İlk eklenen fotoğraf profil fotoğrafınız olur
              </Text>
              <Text style={styles.infoText}>
                ✓ ✓ simgesine basarak herhangi birini profil fotoğrafı yapabilirsiniz
              </Text>
              <Text style={styles.infoText}>
                ✓ En fazla 6 fotoğraf ekleyebilirsiniz
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Kapat</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  photoActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  addPhotoCard: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  addButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  addDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
