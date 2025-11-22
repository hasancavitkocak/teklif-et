import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, X, Zap, Heart, Eye, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface PremiumPopupProps {
  visible: boolean;
  onClose: () => void;
  feature?: 'likes' | 'superLikes' | 'boost' | 'filters';
}

const featureMessages = {
  likes: {
    title: 'Günlük Limit Doldu',
    description: 'Bugün için tüm tekliflerini kullandın. Premium ile sınırsız teklif gönder!',
    icon: Heart,
  },
  superLikes: {
    title: 'Super Like Limiti',
    description: 'Bugün için super like hakkın bitti. Premium ile sınırsız super like!',
    icon: Sparkles,
  },
  boost: {
    title: 'Profil Boost',
    description: 'Premium üyeler profillerini öne çıkarabilir ve daha fazla eşleşme alabilir!',
    icon: Zap,
  },
  filters: {
    title: 'Gelişmiş Filtreler',
    description: 'Premium üyeler detaylı arama kriterleri ile tam istediği kişiyi bulabilir!',
    icon: Eye,
  },
};

export default function PremiumPopup({ visible, onClose, feature = 'likes' }: PremiumPopupProps) {
  const router = useRouter();
  const featureInfo = featureMessages[feature];
  const FeatureIcon = featureInfo.icon;

  const handleGoToPremium = () => {
    onClose();
    router.push('/(tabs)/premium');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.popupContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#A855F7', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.popup}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <View style={styles.closeButtonInner}>
                <X size={20} color="#8B5CF6" />
              </View>
            </TouchableOpacity>

            {/* Crown Icon */}
            <View style={styles.crownContainer}>
              <View style={styles.crownGlow}>
                <Crown size={60} color="#FFF" fill="#FFF" />
              </View>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
            >
              <Text style={styles.title}>Premium'a Geç</Text>
              
              <View style={styles.featureHighlight}>
                <View style={styles.featureIconContainer}>
                  <FeatureIcon size={28} color="#FFF" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{featureInfo.title}</Text>
                  <Text style={styles.featureDescription}>{featureInfo.description}</Text>
                </View>
              </View>

              {/* Premium Features */}
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <View style={styles.featureItemIcon}>
                    <Heart size={24} color="#FFF" />
                  </View>
                  <Text style={styles.featureItemText}>Sınırsız{'\n'}Teklif</Text>
                </View>
                
                <View style={styles.featureItem}>
                  <View style={styles.featureItemIcon}>
                    <Sparkles size={24} color="#FFF" />
                  </View>
                  <Text style={styles.featureItemText}>Sınırsız{'\n'}Super Like</Text>
                </View>
                
                <View style={styles.featureItem}>
                  <View style={styles.featureItemIcon}>
                    <Zap size={24} color="#FFF" />
                  </View>
                  <Text style={styles.featureItemText}>Profil{'\n'}Boost</Text>
                </View>
                
                <View style={styles.featureItem}>
                  <View style={styles.featureItemIcon}>
                    <Eye size={24} color="#FFF" />
                  </View>
                  <Text style={styles.featureItemText}>Gelişmiş{'\n'}Filtreler</Text>
                </View>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleGoToPremium}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFF', '#F3E8FF']}
                  style={styles.ctaGradient}
                >
                  <Crown size={24} color="#8B5CF6" fill="#8B5CF6" />
                  <Text style={styles.ctaText}>Premium Ol</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Price Info */}
              <View style={styles.priceInfo}>
                <Text style={styles.priceText}>₺149/ay'dan başlayan fiyatlarla</Text>
                <Text style={styles.priceSubtext}>İstediğin zaman iptal edebilirsin</Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9998,
  },
  popupContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.85,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 999,
    zIndex: 10000,
  },
  popup: {
    flex: 1,
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  crownContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  crownGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featureHighlight: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaButton: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  priceInfo: {
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  priceSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});
