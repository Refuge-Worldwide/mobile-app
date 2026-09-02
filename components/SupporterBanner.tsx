import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * "Become a supporter" banner — support image (same 16:9 crop as
 * ShowCard), with the label centered over the image. Only rendered for
 * signed-out users (see call sites in app/(tabs)/radio/index.tsx and
 * app/(tabs)/search/index.tsx).
 */
export function SupporterBanner() {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();

  const handlePress = () => {
    router.push("/(tabs)/account?mode=signup" as any);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Image
        source={require("@/assets/images/support-image.jpg")}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.overlay}>
        <View style={[styles.pill, { backgroundColor: textColor }]}>
          <ThemedText style={{ color: backgroundColor }}>
            Become a supporter
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
