import { useThemeColor } from '@/hooks/useThemeColor';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

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
  | 'skip-forward'
  | 'skip-backward'
  | 'schedule'

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
      case 'skip-forward':
        return <Ionicons name="reload" size={size} color={iconColor} style={style} />;
      case 'skip-backward':
        return <Ionicons name="reload" size={size} color={iconColor} style={{ transform: [{ scaleX: -1 }] }} />;
      case 'schedule':
        return (
          <Svg width={size} height={size} viewBox="0 0 834.22 836.02" style={style as StyleProp<any>}>
            <Path
              fill={iconColor}
              d="M677.75,156.6c27.83-.03,51.38-21.36,51.69-48.59l.62-55.91,52.21.28c28.32.15,51.95,23.04,51.95,52.38l-.04,679.59c0,28.5-23.21,51.6-51.54,51.61l-729.23.05c-28.96,0-53.32-21.89-53.33-51.7l-.08-684.75c3.23-26.95,23.88-46.93,50.67-47.11l53.51-.35.78,57.6c.37,26.86,24.4,46.83,50.82,46.87l102.89.14c28.82.57,53.79-21.37,53.96-50.65l.31-53.86h208.19s.48,53.87.48,53.87c.26,28.6,24.01,50.48,52.15,50.66l103.97-.13ZM260.67,470.09l-.03-104.29h-104.24s0,104.47,0,104.47l104.27-.18ZM469.4,470.1l-.02-104.31-104.5.02v104.45s104.53-.15,104.53-.15ZM677.9,470.2l-.06-104.42-104.23.02v104.4s104.29,0,104.29,0ZM260.67,679.09l-.03-104.29h-104.24s0,104.47,0,104.47l104.27-.18ZM469.4,679.1l-.02-104.31-104.5.02v104.45s104.53-.15,104.53-.15ZM677.9,679.2l-.06-104.42-104.23.02v104.4s104.29,0,104.29,0Z"
            />
            <Rect fill={iconColor} x="156.37" y="0" width="104.29" height="104.51" />
            <Rect fill={iconColor} x="573.6" y="0" width="104.29" height="104.51" />
          </Svg>
        );
      default:
        return null;
    }
  };

  return getIconComponent();
}