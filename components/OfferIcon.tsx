import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface OfferIconProps {
  size?: number;
  style?: ImageStyle;
  tintColor?: string;
}

export default function OfferIcon({ size = 24, style, tintColor }: OfferIconProps) {
  return (
    <Image 
      source={require('@/assets/icons/offer.png')} 
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