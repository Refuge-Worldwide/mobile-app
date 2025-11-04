import { useThemeColor } from '@/hooks/useThemeColor';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, type StyleProp, type TextStyle } from 'react-native';

// Define available icon names
export type IconName =
  | 'play'
  | 'pause'
  | 'stop'
  | 'loading'
  | 'heart'
  | 'heart-outline'
  | 'add-to-queue'
  | 'plus'
  | 'share'
  | 'open-outline'

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
      case 'pause':
        return <Ionicons name="pause-sharp" size={size} color={iconColor} style={style} />;
      case 'stop':
        return <Ionicons name="stop-sharp" size={size} color={iconColor} style={style} />;
      case 'loading':
        // ActivityIndicator accepts 'small' or 'large', or a number
        // For sizes < 40, use 'small', otherwise 'large'
        const activitySize = size && size >= 40 ? 'large' : 'small';
        return <ActivityIndicator size={activitySize} color={iconColor} />;
      case 'heart':
        return <Ionicons name="heart" size={size} color={iconColor} style={style} />;
      case 'heart-outline':
        return <Ionicons name="heart-outline" size={size} color={iconColor} style={style} />;
      case 'add-to-queue':
        return <Ionicons name="list" size={size} color={iconColor} style={style} />;
      case 'plus':
        return <Ionicons name="add" size={size} color={iconColor} style={style} />;
      case 'share':
        return <Ionicons name="share-outline" size={size} color={iconColor} style={style} />;
      case 'open-outline':
        return <Ionicons name="open-outline" size={size} color={iconColor} style={style} />;
      default:
        return null;
    }
  };

  return getIconComponent();
}