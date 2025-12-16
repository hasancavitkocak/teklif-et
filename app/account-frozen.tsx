import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Snowflake, RefreshCw, LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import InfoToast from '@/components/InfoToast';
import ErrorToast from '@/components/ErrorToast';

export default function AccountFrozenScreen() {
  const { unfreezeAccount, signOut } = useAuth();
  const router = useRouter();
  
  // Toast states
  const [showInfoToast, setShowInfoToast] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUnfreeze = async () => {
    try {
      const success = await unfreezeAccount();
      if (success) {
        setInfoMessage('Hesabınız başarıyla aktif hale getirildi! Yönlendiriliyorsunuz...');
        setShowInfoToast(true);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else {
        setErrorMessage('Hesabınız aktif edilirken bir hata oluştu. Lütfen tekrar deneyin.');
        setShowErrorToast(true);
      }
    } catch (error) {
      setErrorMessage('Hesabınız aktif edilirken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowErrorToast(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/welcome');
    } catch (error) {
      console.error('Sign out error:', error);
      // Hata olsa bile yönlendir
      router.replace('/auth/welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Snowflake size={80} color="#60A5FA" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Hesabınız Dondurulmuş</Text>

        {/* Description */}
        <Text style={styles.description}>
          Hesabınız geçici olarak dondurulmuş durumda. Bu süreçte:
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>Profiliniz başkaları tarafından görülmüyor</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>Teklifleriniz gizli durumda</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>Mesajlarınız dondurulmuş</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>İstediğiniz zaman hesabınızı aktif edebilirsiniz</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.unfreezeButton} onPress={handleUnfreeze}>
            <RefreshCw size={20} color="#FFF" />
            <Text style={styles.unfreezeButtonText}>Hesabı Aktif Et</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={18} color="#6B7280" />
            <Text style={styles.signOutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Toast */}
      <InfoToast
        visible={showInfoToast}
        message={infoMessage}
        onHide={() => setShowInfoToast(false)}
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    color: '#60A5FA',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  buttonsContainer: {
    alignSelf: 'stretch',
    gap: 16,
  },
  unfreezeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#60A5FA',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unfreezeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
});