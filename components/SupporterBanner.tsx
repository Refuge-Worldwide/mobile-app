import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * "Become a supporter" banner — a centered text pill on a plain background
 * (archive tab, after the 2nd show), or the round supporter badge over the
 * support-image.jpg photo (search tab, over the empty-search state). Only
 * rendered for signed-out users (see call sites in
 * app/(tabs)/radio/index.tsx and app/(tabs)/search/index.tsx).
 */
export function SupporterBanner({
  overlay = "badge",
}: {
  overlay?: "pill" | "badge";
} = {}) {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();

  const handlePress = () => {
    router.push("/(tabs)/account?mode=signup" as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        overlay === "pill"
          ? [styles.containerPill, { backgroundColor }]
          : styles.containerBadge,
      ]}
    >
      {overlay === "badge" && (
        <Image
          source={require("@/assets/images/support-image.jpg")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}
      {overlay === "pill" ? (
        <View style={[styles.pill, { backgroundColor: textColor }]}>
          <ThemedText style={{ color: backgroundColor }}>
            Become a supporter
          </ThemedText>
        </View>
      ) : (
        <View style={styles.badge}>
          <Image
            source={require("@/assets/images/supporter.png")}
            style={styles.badgeImage}
            contentFit="contain"
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    // No bottom margin here — every call site already provides its own
    // spacing after this (a FlatList ItemSeparatorComponent on the archive
    // tab, or being the last element in the search tab's empty state), so
    // a built-in margin here would double up with it.
  },
  containerPill: {
    aspectRatio: 3,
  },
  containerBadge: {
    aspectRatio: 16 / 9,
    // Fixed (not percentage-based) so the badge's top/bottom padding is
    // guaranteed equal, rather than emerging from width-based sizing.
    paddingVertical: 28,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Fills the padded area above; width follows from aspectRatio: 1.
  badge: {
    height: "100%",
    aspectRatio: 1,
  },
  badgeImage: {
    width: "100%",
    height: "100%",
  },
});
