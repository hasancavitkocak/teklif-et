import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera as CameraIcon, Image as ImageIcon, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import WarningToast from '@/components/WarningToast';
import ErrorToast from '@/components/ErrorToast';
import { checkImageBeforeUpload } from '@/utils/imageModeration';

export default function PhotosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<any>(null);
  
  // Toast states
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openCamera = async () => {
    // 6 fotoğraf limiti kontrolü
    if (photos.length >= 6) {
      setWarningMessage('En fazla 6 fotoğraf ekleyebilirsiniz');
      setShowWarningToast(true);
      return;
    }

    if (Platform.OS === 'web') {
      // Web'de file input kullan
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      
      // İzin kontrolü
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission result:', permissionResult);

      if (permissionResult.status !== 'granted') {
        setWarningMessage('Kamera kullanmak için izin vermelisiniz');
        setShowWarningToast(true);
        return;
      }

      // Kamerayı aç
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = result.assets[0].uri;
        console.log('Adding photo:', newPhoto);
        triggerHaptic();
        setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setErrorMessage(`Fotoğraf çekilemedi: ${error.message || 'Bilinmeyen hata'}`);
      setShowErrorToast(true);
    }
  };

  const openGallery = async () => {
    // 6 fotoğraf limiti kontrolü
    if (photos.length >= 6) {
      setWarningMessage('En fazla 6 fotoğraf ekleyebilirsiniz');
      setShowWarningToast(true);
      return;
    }

    if (Platform.OS === 'web') {
      // Web'de file input kullan
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    try {
      const ImagePicker = require('expo-image-picker');
      
      // İzin kontrolü
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Gallery permission result:', permissionResult);

      if (permissionResult.status !== 'granted') {
        setWarningMessage('Galeri erişimi için izin vermelisiniz');
        setShowWarningToast(true);
        return;
      }

      // Galeriyi aç
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('Gallery result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = result.assets[0].uri;
        console.log('Adding photo:', newPhoto);
        triggerHaptic();
        setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      setErrorMessage(`Fotoğraf seçilemedi: ${error.message || 'Bilinmeyen hata'}`);
      setShowErrorToast(true);
    }
  };

  const handleFileChange = (event: any) => {
    // 6 fotoğraf limiti kontrolü
    if (photos.length >= 6) {
      setWarningMessage('En fazla 6 fotoğraf ekleyebilirsiniz');
      setShowWarningToast(true);
      return;
    }

    const file = event.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          triggerHaptic();
          setPhotos(prevPhotos => [...prevPhotos, result]);
        }
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };


  const removePhoto = (index: number) => {
    console.log('Removing photo at index:', index);
    triggerHaptic();
    setPhotos(prevPhotos => {
      const newPhotos = prevPhotos.filter((_, i) => i !== index);
      console.log('Photos after removal:', newPhotos.length);
      return newPhotos;
    });
  };

  const uploadPhotoToStorage = async (uri: string, index: number): Promise<string> => {
    try {
      const fileExt = 'jpg';
      const fileName = `${user?.id}/${Date.now()}_${index}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Fetch ile ArrayBuffer al (hem web hem mobile çalışır)
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Public URL al
      const { data } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // 🔍 VISION API KONTROLÜ
      console.log('🔍 Vision API ile fotoğraf kontrol ediliyor...');
      const moderationResult = await checkImageBeforeUpload(publicUrl);
      
      if (!moderationResult.isAppropriate) {
        // Uygunsuz fotoğraf - Storage'dan sil
        await supabase.storage
          .from('profile-photos')
          .remove([filePath]);
        
        throw new Error(`Fotoğraf reddedildi: ${moderationResult.reasons.join(', ')}`);
      }

      console.log('✅ Fotoğraf Vision API kontrolünden geçti');

      console.log('✅ Fotoğraf Vision API kontrolünden geçti');
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    if (photos.length < 2) {
      setWarningMessage('Devam etmek için en az 2 fotoğraf eklemelisiniz');
      setShowWarningToast(true);
      return;
    }

    setLoading(true);
    try {
      // Fotoğrafları Supabase Storage'a yükle
      const uploadedUrls = await Promise.all(
        photos.map((uri, index) => uploadPhotoToStorage(uri, index))
      );

      // Database'e kaydet
      const photoInserts = uploadedUrls.map((url, index) => ({
        profile_id: user?.id,
        photo_url: url,
        order: index,
      }));

      const { error: photosError } = await supabase
        .from('profile_photos')
        .insert(photoInserts);

      if (photosError) throw photosError;

      // Profil fotoğrafını güncelle (ilk fotoğraf)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          profile_photo: uploadedUrls[0],
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Complete error:', error);
      setErrorMessage(error.message || 'Fotoğraflar yüklenemedi');
      setShowErrorToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: '100%' }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.stepIndicator}>Adım 7/7</Text>
          <Text style={styles.title}>Fotoğraflarınızı ekleyin</Text>
          <Text style={styles.subtitle}>
            En az 2 fotoğraf gerekli ({photos.length}/6)
          </Text>
        </View>

        <View style={styles.uploadSection}>
          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={[
                styles.addPhotoCard,
                photos.length >= 6 && styles.addPhotoCardDisabled
              ]}
              onPress={openCamera}
              activeOpacity={photos.length >= 6 ? 1 : 0.7}
              disabled={photos.length >= 6}
            >
              <View style={styles.addPhotoContent}>
                <View style={[
                  styles.addPhotoIconContainer,
                  photos.length >= 6 && styles.addPhotoIconDisabled
                ]}>
                  <CameraIcon 
                    size={28} 
                    color={photos.length >= 6 ? '#9CA3AF' : '#8B5CF6'} 
                    strokeWidth={2} 
                  />
                </View>
                <Text style={[
                  styles.addPhotoText,
                  photos.length >= 6 && styles.addPhotoTextDisabled
                ]}>
                  Kamera
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.addPhotoCard,
                photos.length >= 6 && styles.addPhotoCardDisabled
              ]}
              onPress={openGallery}
              activeOpacity={photos.length >= 6 ? 1 : 0.7}
              disabled={photos.length >= 6}
            >
              <View style={styles.addPhotoContent}>
                <View style={[
                  styles.addPhotoIconContainer,
                  photos.length >= 6 && styles.addPhotoIconDisabled
                ]}>
                  <ImageIcon 
                    size={28} 
                    color={photos.length >= 6 ? '#9CA3AF' : '#8B5CF6'} 
                    strokeWidth={2} 
                  />
                </View>
                <Text style={[
                  styles.addPhotoText,
                  photos.length >= 6 && styles.addPhotoTextDisabled
                ]}>
                  Galeri
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
                <View key={index} style={styles.photoThumbnail}>
                  <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                  {index === 0 && (
                    <View style={styles.primaryBadgeSmall}>
                      <Text style={styles.primaryTextSmall}>Ana</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButtonSmall}
                    onPress={() => removePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <X size={14} color="#FFF" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (photos.length < 2 || loading) && styles.disabledButton]}
            onPress={() => {
              triggerHaptic();
              handleComplete();
            }}
            disabled={photos.length < 2 || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Tamamlanıyor...' : 'Tamamla'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Warning Toast */}
      <WarningToast
        visible={showWarningToast}
        message={warningMessage}
        onHide={() => setShowWarningToast(false)}
      />

      {/* Error Toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorMessage}
        onHide={() => setShowErrorToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E5E7EB',
    marginTop: 60,
  },
  progress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleContainer: {
    marginBottom: 28,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  uploadSection: {
    flex: 1,
    marginBottom: 16,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photosScrollContainer: {
    maxHeight: 120,
  },
  photosScrollContent: {
    gap: 12,
    paddingRight: 12,
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
  addPhotoCard: {
    width: '48%',
    height: 120,
    backgroundColor: '#F9F5FF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderStyle: 'solid',
  },
  addPhotoCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
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
  addPhotoIconDisabled: {
    backgroundColor: '#F9FAFB',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  addPhotoTextDisabled: {
    color: '#9CA3AF',
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  button: {
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
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraCloseButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFF',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },
});
