import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#8B5CF6', '#A855F7']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/puzzle-icon.png')} 
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.logo}>Teklif Et</Text>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Aktivite bazlı</Text>
          <Text style={styles.tagline}>buluşma platformu</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/auth/phone')}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>Başlayalım</Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Devam ederek{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
                Kullanım Koşulları
              </Text>
              {' '}ve{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
                Gizlilik Politikası
              </Text>
              'nı kabul ediyorsunuz
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: height * 0.15,
    paddingBottom: 60,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 140,
    height: 140,
    tintColor: '#FFF',
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.95,
  },
  buttonContainer: {
    gap: 20,
  },
  startButton: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  termsContainer: {
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.75,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsLink: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
    opacity: 1,
  },
});
