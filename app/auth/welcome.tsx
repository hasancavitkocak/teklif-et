import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart } from 'lucide-react-native';

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
          <Heart size={64} color="#FFF" fill="#FFF" />
          <Text style={styles.logo}>Teklif.et</Text>
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

          <Text style={styles.terms}>
            Devam ederek Kullanım Koşulları ve{'\n'}Gizlilik Politikasını kabul ediyorsunuz
          </Text>
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
    gap: 16,
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -1,
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
  terms: {
    fontSize: 13,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
  },
});
