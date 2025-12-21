import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Store, MapPin, X, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SwipeCardProps {
  proposal: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  calculateAge: (birthDate: string) => number;
  isLoading?: boolean;
}

export default function SwipeCard({
  proposal,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  calculateAge,
  isLoading = false,
}: SwipeCardProps) {
  const router = useRouter();
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Minimum hareket mesafesi
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Animasyonu başlat
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isLoading) return;

        const { dx, dy } = gestureState;
        
        // Kart pozisyonunu güncelle
        pan.setValue({ x: dx, y: dy });
        
        // Rotasyon efekti (sadece yatay hareket için)
        const rotation = dx * 0.1;
        rotate.setValue(rotation);
        
        // Swipe yönünü belirle
        if (Math.abs(dy) > Math.abs(dx) && dy < -50) {
          setSwipeDirection('up'); // Yukarı - Super Like
        } else if (dx > 50) {
          setSwipeDirection('right'); // Sağa - Like
        } else if (dx < -50) {
          setSwipeDirection('left'); // Sola - Pass
        } else {
          setSwipeDirection(null);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isLoading) return;

        const { dx, dy, vx, vy } = gestureState;
        
        // Hız ve mesafe kontrolü
        const swipeThreshold = screenWidth * 0.25;
        const velocityThreshold = 0.3;
        
        // Super Like (Yukarı)
        if (dy < -100 || (dy < -50 && vy < -velocityThreshold)) {
          animateSwipeUp();
          return;
        }
        
        // Like (Sağa)
        if (dx > swipeThreshold || (dx > 50 && vx > velocityThreshold)) {
          animateSwipeRight();
          return;
        }
        
        // Pass (Sola)
        if (dx < -swipeThreshold || (dx < -50 && vx < -velocityThreshold)) {
          animateSwipeLeft();
          return;
        }
        
        // Geri dön
        resetCard();
      },
    })
  ).current;

  const animateSwipeLeft = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: -screenWidth * 1.5, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotate, {
        toValue: -30,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onSwipeLeft();
      resetCard();
    });
  };

  const animateSwipeRight = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: screenWidth * 1.5, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotate, {
        toValue: 30,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onSwipeRight();
      resetCard();
    });
  };

  const animateSwipeUp = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: 0, y: -screenHeight * 1.5 },
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onSwipeUp();
      resetCard();
    });
  };

  const resetCard = () => {
    setSwipeDirection(null);
    pan.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
    scale.setValue(1);
  };

  // Programmatik swipe fonksiyonları
  const triggerSwipeLeft = () => animateSwipeLeft();
  const triggerSwipeRight = () => animateSwipeRight();
  const triggerSwipeUp = () => animateSwipeUp();

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, screenWidth * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = pan.x.interpolate({
    inputRange: [-screenWidth * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const superLikeOpacity = pan.y.interpolate({
    inputRange: [-screenHeight * 0.25, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate: rotateInterpolate },
              { scale: scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.cardContent}
          onPress={() => router.push(`/profile/${proposal.creator_id}` as any)}
          activeOpacity={0.95}
        >
          <Image
            source={{ uri: proposal.creator.profile_photo }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
          >
            {/* Ana Container - Yan Yana */}
            <View style={styles.cardBottomContainer}>
              {/* Sol Taraf - Aktivite ve Kullanıcı */}
              <View style={styles.cardLeftInfo}>
                <Text style={styles.activityName}>{proposal.activity_name}</Text>
                <Text style={styles.userName}>
                  {proposal.creator.name}, {calculateAge(proposal.creator.birth_date)}
                </Text>
              </View>
              
              {/* Sağ Taraf - Tarih/Saat/Mekan/Konum */}
              {(proposal.event_datetime || proposal.venue_name || proposal.city) && (
                <View style={styles.cardRightInfo}>
                  {/* Tarih */}
                  {proposal.event_datetime && (
                    <View style={styles.infoItem}>
                      <Calendar size={12} color="#FFF" />
                      <Text style={styles.infoText}>
                        {new Date(proposal.event_datetime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </Text>
                    </View>
                  )}
                  
                  {/* Mekan ve Konum - Alt Alta */}
                  {proposal.venue_name && (
                    <View style={styles.infoItem}>
                      <Store size={12} color="#FFF" />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {proposal.venue_name}
                      </Text>
                    </View>
                  )}
                  {proposal.city && (
                    <View style={styles.infoItem}>
                      <MapPin size={12} color="#FFF" />
                      <Text style={styles.infoText}>{proposal.city}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            
            {/* Kategori - En Alt */}
            {proposal.interest && (
              <View style={styles.interestChip}>
                <Text style={styles.interestText}>{proposal.interest.name}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Swipe İndikatorları */}
        {/* PASS - Sol */}
        <Animated.View style={[styles.swipeIndicator, styles.passIndicator, { opacity: passOpacity }]}>
          <X size={40} color="#EF4444" strokeWidth={3} />
          <Text style={styles.passText}>GEÇ</Text>
        </Animated.View>

        {/* LIKE - Sağ */}
        <Animated.View style={[styles.swipeIndicator, styles.likeIndicator, { opacity: likeOpacity }]}>
          <Image 
            source={require('@/assets/images/puzzle-iconnew.png')} 
            style={styles.puzzleIcon}
            resizeMode="contain"
          />
          <Text style={styles.likeText}>TEKLİF ET</Text>
        </Animated.View>

        {/* SUPER LIKE - Yukarı */}
        <Animated.View style={[styles.swipeIndicator, styles.superLikeIndicator, { opacity: superLikeOpacity }]}>
          <Zap size={40} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
          <Text style={styles.superLikeText}>SÜPER BEĞENİ</Text>
        </Animated.View>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.passButton} 
          onPress={triggerSwipeLeft}
          disabled={isLoading}
        >
          <X size={32} color={isLoading ? "#EF444450" : "#EF4444"} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.superLikeButton}
          onPress={triggerSwipeUp}
          disabled={isLoading}
        >
          <Zap 
            size={28} 
            color={isLoading ? "#FFFFFF50" : "#FFF"} 
            fill={isLoading ? "#FFFFFF50" : "#FFF"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.likeButton} 
          onPress={triggerSwipeRight}
          disabled={isLoading}
        >
          <Image 
            source={require('@/assets/images/puzzle-iconnew.png')} 
            style={{ 
              width: 48, 
              height: 48, 
              tintColor: isLoading ? '#8B5CF650' : '#8B5CF6',
              opacity: isLoading ? 0.5 : 1
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    flex: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingTop: 100,
  },
  cardBottomContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardLeftInfo: {
    flex: 1,
    gap: 6,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  cardRightInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Swipe İndikatorları
  swipeIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  passIndicator: {
    top: 120,
    left: 20,
    transform: [{ rotate: '-15deg' }],
    minWidth: 80,
  },
  likeIndicator: {
    top: 120,
    right: 20,
    transform: [{ rotate: '15deg' }],
    minWidth: 80,
  },
  superLikeIndicator: {
    top: 60,
    left: '50%',
    marginLeft: -50,
    width: 100,
  },
  puzzleIcon: {
    width: 40,
    height: 40,
    tintColor: '#8B5CF6',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  passText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
    textAlign: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  likeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
    textAlign: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  superLikeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
    textAlign: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  passButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  superLikeButton: {
    width: 56,
    height: 56,
    backgroundColor: '#F59E0B',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  likeButton: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});