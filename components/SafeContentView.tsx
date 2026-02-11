import { useAudioStore } from "@/store/audioStore";
import { ScrollView, ScrollViewProps, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";

// Audio player height: paddingVertical 4 * 2 + content height 40 = 48px
const AUDIO_PLAYER_HEIGHT = 48;

type SafeContentViewProps = (ViewProps | ScrollViewProps) & {
  lightColor?: string;
  darkColor?: string;
  scrollable?: boolean;
};

export function SafeContentView({
  style,
  lightColor,
  darkColor,
  scrollable = false,
  children,
  ...otherProps
}: SafeContentViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );
  const insets = useSafeAreaInsets();
  const { currentTrack } = useAudioStore();

  // Calculate tab bar height (matches AudioPlayer calculation)
  const tabBarHeight = 80 + Math.max(insets.bottom, 11);

  // Add extra padding when audio player is visible
  const audioPlayerPadding = currentTrack ? AUDIO_PLAYER_HEIGHT : 0;

  // Total bottom padding: tab bar + audio player (if visible)
  const totalBottomPadding = tabBarHeight + audioPlayerPadding;

  const containerStyle = [{ backgroundColor }, style];
  const contentStyle = { paddingBottom: totalBottomPadding };

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={contentStyle}
        {...(otherProps as ScrollViewProps)}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[containerStyle, contentStyle]} {...(otherProps as ViewProps)}>
      {children}
    </View>
  );
}
