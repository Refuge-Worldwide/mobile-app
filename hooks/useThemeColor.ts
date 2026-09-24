import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type SharedColorName = keyof (typeof Colors)[keyof typeof Colors];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: SharedColorName
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps =
    theme === 'light' || theme === 'dark' ? props[theme] : undefined;

  return colorFromProps || Colors[theme][colorName];
}
