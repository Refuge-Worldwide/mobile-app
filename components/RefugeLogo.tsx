import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';
import React from 'react';


interface RefugeLogoProps {
  size?: number;
  color?: string;
}

export function RefugeLogo({ size = 50, color }: RefugeLogoProps) {
  const defaultColor = useThemeColor({}, 'text');
  const logoColor = color || defaultColor;

  return (
    <Image
      source={require('../assets/images/logo-pink.png')}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  );
}