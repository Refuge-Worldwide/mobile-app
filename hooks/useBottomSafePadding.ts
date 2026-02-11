import { useAudioStore } from "@/store/audioStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Audio player height: paddingVertical 4 * 2 + content height 40 = 48px
const AUDIO_PLAYER_HEIGHT = 48;

export function useBottomSafePadding() {
  const insets = useSafeAreaInsets();
  const { currentTrack } = useAudioStore();

  // Calculate tab bar height (matches AudioPlayer calculation)
  const tabBarHeight = 80 + Math.max(insets.bottom, 11);

  // Add extra padding when audio player is visible
  const audioPlayerPadding = currentTrack ? AUDIO_PLAYER_HEIGHT : 0;

  // Total bottom padding: tab bar + audio player (if visible)
  return tabBarHeight + audioPlayerPadding;
}
