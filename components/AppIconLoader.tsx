import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

interface AppIconLoaderProps {
  size?: number;
  style?: any;
}

export const AppIconLoader: React.FC<AppIconLoaderProps> = ({ 
  size = 80, 
  style 
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Image
          source={require('../assets/images/app-icon-new.png')}
          style={[styles.icon, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    borderRadius: 12,
  },
});