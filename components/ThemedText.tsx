import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'large' | 'title' | 'subtitle';
};

export function ThemedText({
  style,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({}, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'large' ? styles.large : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: 'VisueltMedium',
  },
  large: {
    fontSize: 24,
    fontFamily: 'VisueltMedium',
    letterSpacing: -1,
  },
  title: {
    fontSize: 40,
    fontFamily: 'ABCArizonaFlare',
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'ABCArizonaFlare',
  },
});
