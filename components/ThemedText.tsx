import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

// TODO: ABCArizonaFlare causes some short strings to wrap in Android's
// text layout even though there's plenty of width (e.g. "Art Rock"), only an issue
// within the genres drawer, for now using VisueltMedium on android to fix this.
const BEEFY_TAG_FONT_FAMILY = Platform.OS === 'android' ? 'VisueltMedium' : 'ABCArizonaFlare';
const BEEFY_TAG_ANDROID_STYLE = Platform.OS === 'android' ? { marginBottom: -4 } : null;

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'large' | 'title' | 'subtitle' | 'tag' | 'beefyTag' | 'player';
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
        type === 'tag' ? styles.tag : undefined,
        type === 'beefyTag' ? styles.beefyTag : undefined,
        type === 'player' ? styles.player : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 17,
    lineHeight: 19,
    fontFamily: 'VisueltMedium',
  },
  large: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: 'VisueltMedium',
    letterSpacing: -1,
  },
  title: {
    fontSize: 40,
    lineHeight: 40,
    fontFamily: 'ABCArizonaFlare',
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 22,
    fontFamily: 'ABCArizonaFlare',
  },
  tag: {
    fontSize: 17,
    lineHeight: 19,
    fontFamily: 'ABCArizonaFlare',
  },
  beefyTag: {
    fontSize: 19,
    lineHeight: 22,
    fontFamily: BEEFY_TAG_FONT_FAMILY,
    ...BEEFY_TAG_ANDROID_STYLE,
  },
  player: {
    fontSize: 20,
    lineHeight: 22,
    fontFamily: 'ABCArizonaFlare',
  }
});
