import React from 'react';
import { Image, ImageStyle } from 'react-native';

interface AddUserIconProps {
  size?: number;
  style?: ImageStyle;
  tintColor?: string;
}

export default function AddUserIcon({ size = 24, style, tintColor }: AddUserIconProps) {
  return (
    <Image 
      source={require('@/assets/icons/add-user.png')} 
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