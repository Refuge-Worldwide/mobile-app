import { useThemeColor } from '@/hooks/useThemeColor';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

// Define available icon names
export type IconName =
  | 'play'
  | 'stop'
  | 'loading'
  | 'heart'
  | 'heart-outline'

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  withShadow?: boolean;
}

export function Icon({
  name,
  size = 24,
  color,
  style,
}: IconProps) {
  const themeColor = useThemeColor({}, 'text');
  const iconColor = color || themeColor;

  const getIconComponent = () => {
    switch (name) {
      case 'play':
        return <Ionicons name="play-sharp" size={size} color={iconColor} style={style} />;
      case 'stop':
        return <Ionicons name="stop-sharp" size={size} color={iconColor} style={style} />;
      case 'loading':
        return <Ionicons name="refresh" size={size} color={iconColor} style={style} />;
      case 'heart':
        return <Ionicons name="heart" size={size} color={iconColor} style={style} />;
      case 'heart-outline':
        return <Ionicons name="heart-outline" size={size} color={iconColor} style={style} />;
      default:
        return null;
    }
  };

  return getIconComponent();
}