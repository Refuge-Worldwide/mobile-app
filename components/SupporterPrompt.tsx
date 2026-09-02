import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

/**
 * "Become a supporter" drawer content — shown to signed-out users when
 * they start playing the live stream (see app/(tabs)/live/index.tsx).
 * Doesn't block playback; it's a nudge, dismissible via the sheet's own
 * pan-down/backdrop-tap handling.
 */
export function SupporterPrompt({ onClose }: { onClose?: () => void }) {
  const router = useRouter();

  const handlePress = () => {
    onClose?.();
    router.push("/(tabs)/account?mode=signup" as any);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/support-image.jpg")}
        style={styles.image}
        contentFit="cover"
      />
      <ThemedText type="subtitle" style={styles.heading}>
        Help keep independent radio alive.
      </ThemedText>
      <ThemedButton
        title="Become a supporter"
        onPress={handlePress}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 8,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginBottom: 20,
  },
  heading: {
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    alignSelf: "stretch",
  },
});
