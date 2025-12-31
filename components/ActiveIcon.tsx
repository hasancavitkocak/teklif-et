import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface ActiveIconProps {
  size?: number;
  style?: ImageStyle;
  tintColor?: string;
}

export default function ActiveIcon({ size = 24, style, tintColor }: ActiveIconProps) {
  return (
    <Image 
      source={require('@/assets/icons/active.png')} 
      style={[
        {
          width: size,
          height: size,
          tintColor: tintColor,
        },
        style
      ]}
      resizeMode="contain"
    />
  );
}