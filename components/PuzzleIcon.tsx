import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface PuzzleIconProps {
  size?: number;
  style?: ImageStyle;
  tintColor?: string;
}

export default function PuzzleIcon({ size = 24, style, tintColor }: PuzzleIconProps) {
  return (
    <Image 
      source={require('@/assets/icons/puzzle.png')} 
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