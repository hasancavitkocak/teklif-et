import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface SuperLikeIconProps {
  size?: number;
  style?: ImageStyle;
}

export default function SuperLikeIcon({ size = 24, style }: SuperLikeIconProps) {
  return (
    <Image 
      source={require('@/assets/icons/super-like.png')} 
      style={[
        {
          width: size,
          height: size,
        },
        style
      ]}
      resizeMode="contain"
    />
  );
}