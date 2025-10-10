import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

interface BackButtonProps {
  size?: number;
  style?: any;
  onPress?: () => void;
}

export function BackButton({ size = 24, style, onPress }: BackButtonProps) {
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, style]}
    >
      <Ionicons
        name="arrow-back"
        size={size}
        color={textColor}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});