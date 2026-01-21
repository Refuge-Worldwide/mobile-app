import { Icon } from "@/components/Icon";
import { RefugeLogo } from "@/components/RefugeLogo";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAudioStore } from "@/store/audioStore";
import { Colors } from "@/constants/Colors";
import { useColorSchemeContext } from "@/contexts/ColorSchemeContext";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Sticker images mapping
const stickerImages = [
  require("../../../assets/images/stickers-1.png"),
  require("../../../assets/images/stickers-2.png"),
  require("../../../assets/images/stickers-3.png"),
  require("../../../assets/images/stickers-4.png"),
  require("../../../assets/images/stickers-5.png"),
  require("../../../assets/images/stickers-6.png"),
  require("../../../assets/images/stickers-7.png"),
  require("../../../assets/images/stickers-1.png"),
  require("../../../assets/images/stickers-2.png"),
  require("../../../assets/images/stickers-3.png"),
  require("../../../assets/images/stickers-4.png"),
  require("../../../assets/images/stickers-5.png"),
  require("../../../assets/images/stickers-6.png"),
  require("../../../assets/images/stickers-7.png"),
];

export default function Live() {
  const [liveNow, setLiveNow] = useState<{
    title: string;
    artwork: string;
    slug: string;
    isMixedFeelings: boolean;
  } | null>(null);
  const [liveNowCh2, setLiveNowCh2] = useState<{
    title: string;
    status: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const STICKER_COUNT = 14;
  const stickerAnimations = useRef<Animated.Value[]>(
    Array.from({ length: STICKER_COUNT }, () => new Animated.Value(0))
  ).current;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;

  const {
    currentTrack,
    isPlaying,
    isLoading,
    setLiveTrack,
    setLiveTrackChannel2,
    stopTrack,
  } = useAudioStore();
  const isCurrentlyPlayingLive =
    currentTrack?.isLive && currentTrack?.id === "live-stream" && isPlaying;
  const isCurrentlyPlayingLiveCh2 =
    currentTrack?.isLive && currentTrack?.id === "live-stream-ch2" && isPlaying;

  const fetchLiveShow = useCallback(async () => {
    try {
      const res = await fetch("https://refugeworldwide.com/api/schedule");
      const data = await res.json();
      setLiveNow(data.liveNow);
      // Set Channel 2 data if available
      if (data.ch2) {
        setLiveNowCh2({
          title: data.ch2.liveNow,
          status: data.ch2.status,
        });
      }
      // Note: Live track metadata updates are handled by AudioPlayer
    } catch (error) {
      console.error("Failed to fetch live show:", error);
    }
  }, []);

  // Fetch live show data
  useEffect(() => {
    // Fetch immediately on mount
    fetchLiveShow();

    // Set up interval to fetch every 30 seconds
    const interval = setInterval(fetchLiveShow, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchLiveShow]);

  const playFunction = async () => {
    if (isCurrentlyPlayingLive) {
      // Pause live playback (keeps player open)
      stopTrack();
    } else {
      // Start live playback - setLiveTrack will handle isPlaying and isLoading
      if (liveNow) {
        setLiveTrack({
          title: liveNow.title,
          artwork: liveNow.artwork,
          showId: liveNow.slug || "live-stream",
        });
      }
    }
  };

  const playFunctionCh2 = async () => {
    if (isCurrentlyPlayingLiveCh2) {
      // Pause channel 2 live playback (keeps player open)
      stopTrack();
    } else {
      // Start channel 2 live playback - setLiveTrackChannel2 will handle isPlaying and isLoading
      if (liveNowCh2) {
        setLiveTrackChannel2({
          title: liveNowCh2.title,
          artwork: liveNow?.artwork, // Use Channel 1 artwork as fallback since Ch2 doesn't have artwork
          showId: "live-stream-ch2",
        });
      }
    }
  };

  const openChat = async () => {
    try {
      // Discord app deep link - you can customize this with your specific Discord server/channel
      const discordUrl = "discord://";
      const discordWebUrl = "https://discord.com/";

      // Check if Discord app can be opened
      const canOpenDiscord = await Linking.canOpenURL(discordUrl);

      if (canOpenDiscord) {
        // Open Discord app
        await Linking.openURL(discordUrl);
      } else {
        // If Discord app is not installed, offer to open Discord in browser
        Alert.alert(
          "Discord Not Found",
          "Discord app is not installed. Would you like to open Discord in your browser?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Browser",
              onPress: () => Linking.openURL(discordWebUrl),
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error opening Discord:", error);
      Alert.alert("Error", "Unable to open Discord. Please try again.");
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveShow();
    setRefreshing(false);
  }, [fetchLiveShow]);

  const handleLogoPress = () => {
    setShowStickers(true);
    
    // Reset all animations
    stickerAnimations.forEach(anim => anim.setValue(0));
    
    // Regenerate random positions each time
    stickerPositions.current = Array.from({ length: STICKER_COUNT }, () => ({
      top: Math.random() * (screenHeight - 150),
      left: Math.random() * (screenWidth - 150),
      rotation: (Math.random() * 100) - 50, // -50 to 50 degrees
      scale: 0.8 + Math.random() * 0.8, // Random scale between 0.8 and 1.6
    }));
    
    // Animate stickers with random delays and spring effect
    const animations = stickerAnimations.map((anim, index) => {
      const randomDelay = Math.random() * 400; // Faster pop
      return Animated.sequence([
        Animated.delay(randomDelay),
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.delay(700), // Much quicker fade out
        Animated.timing(anim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]);
    });
    
    Animated.parallel(animations).start(() => {
      setShowStickers(false);
    });
  };

  // Generate random positions for stickers
  const stickerPositions = useRef(
    Array.from({ length: STICKER_COUNT }, () => ({
      top: Math.random() * (screenHeight - 150),
      left: Math.random() * (screenWidth - 150),
      rotation: (Math.random() * 100) - 50,
      scale: 0.8 + Math.random() * 0.8, // Random scale between 0.8 and 1.6
    }))
  );

  const isBothChannelsLive =
    liveNow && liveNowCh2 && liveNowCh2.status === "online";

  // Calculate responsive padding for single channel to center content
  // Account for: header (~66px), player (~84px at bottom: 120), buttons (~40px), safe areas
  const FIXED_ELEMENTS_HEIGHT = 66 + 120 + 40; // header + player position + buttons
  const AVAILABLE_HEIGHT =
    screenHeight - insets.top - insets.bottom - FIXED_ELEMENTS_HEIGHT;
  const singleChannelPaddingTop = AVAILABLE_HEIGHT * 0.15; // Use 15% of available height for top padding

  const { colorScheme } = useColorSchemeContext();
  const colors = Colors[colorScheme] || Colors.light;

  return (
    <ThemedView style={[styles.liveContainer, { paddingTop: insets.top + 8 }]}> 
      <View style={styles.header}>
        <Pressable onPress={handleLogoPress}>
          <RefugeLogo size={50} variant="text" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={[
          styles.scrollContent,
          !isBothChannelsLive && { paddingTop: singleChannelPaddingTop },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={[textColor]}
          />
        }
      >
        <View style={[styles.channelsContainer, { gap: 30 }]}>
          {/* Channel 1 */}
          {liveNow && (
            <View style={styles.channelSection}>
              <Pressable onPress={playFunction} style={styles.imageContainer}>
                <Image
                  style={styles.image}
                  contentFit="cover"
                  transition={1000}
                  placeholder="blurhash"
                  source={liveNow?.artwork}
                />
                <View
                  style={[
                    styles.playButtonContainer,
                    { backgroundColor: textColor },
                  ]}
                >
                  {isLoading &&
                    currentTrack?.id === "live-stream" &&
                    !isCurrentlyPlayingLive ? (
                    <Icon name="loading" size={24} color={backgroundColor} />
                  ) : (
                    <Icon
                      name={isCurrentlyPlayingLive ? "stop" : "play"}
                      size={50}
                      color={backgroundColor}
                    />
                  )}
                </View>
              </Pressable>
              <View style={styles.liveNowContainer}>
                <View style={{ backgroundColor: textColor, padding: 4 }}>
                  <ThemedText
                    type="subtitle"
                    style={{ color: backgroundColor }}
                  >
                    Live now
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() =>
                    router.push(
                      `/live/show/${liveNow.slug}` as any,
                    )
                  }
                  style={{ backgroundColor: textColor, padding: 4 }}
                >
                  <ThemedText
                    type="subtitle"
                    style={{ color: backgroundColor }}
                  >
                    {liveNow.title}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Channel 2 */}
          {liveNowCh2 && liveNowCh2.status === "online" && (
            <View style={styles.channelSection}>
              <Pressable
                onPress={playFunctionCh2}
                style={styles.imageContainer}
              >
                <Image
                  style={styles.image}
                  contentFit="cover"
                  transition={1000}
                  placeholder="blurhash"
                  source={liveNow?.artwork} // Use Channel 1 artwork as fallback
                />
                <View
                  style={[
                    styles.playButtonContainer,
                    { backgroundColor: textColor },
                  ]}
                >
                  {isLoading &&
                    currentTrack?.id === "live-stream-ch2" &&
                    !isCurrentlyPlayingLiveCh2 ? (
                    <Icon name="loading" size={24} color={backgroundColor} />
                  ) : (
                    <Icon
                      name={isCurrentlyPlayingLiveCh2 ? "stop" : "play"}
                      size={50}
                      color={backgroundColor}
                    />
                  )}
                </View>
              </Pressable>
              <View style={styles.liveNowContainer}>
                <View style={{ backgroundColor: textColor, padding: 4 }}>
                  <ThemedText
                    type="subtitle"
                    style={{ color: backgroundColor }}
                  >
                    Live now
                  </ThemedText>
                </View>
                <View style={{ backgroundColor: textColor, padding: 4 }}>
                  <ThemedText
                    type="subtitle"
                    style={{ color: backgroundColor }}
                  >
                    {liveNowCh2.title}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <Pressable
          onPress={openChat}
          style={[
            styles.menuButton,
            { backgroundColor: textColor, borderColor: textColor },
          ]}
        >
          <ThemedText type="large" style={{ color: backgroundColor }}>
            Chat
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.menuButton,
            { backgroundColor: textColor, borderColor: textColor },
          ]}
        >
          <Link href="/live/schedule" style={styles.buttonLink}>
            <ThemedText type="large" style={{ color: backgroundColor }}>
              Schedule
            </ThemedText>
          </Link>
        </Pressable>
      </View>

      {/* Sticker flood overlay */}
      {showStickers && (
        <View style={[styles.stickerOverlay, { zIndex: 9999, elevation: 99 }]} pointerEvents="none">
          {stickerAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.sticker,
                {
                  top: stickerPositions.current[index].top,
                  left: stickerPositions.current[index].left,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, stickerPositions.current[index].scale],
                      }),
                    },
                    { rotate: `${stickerPositions.current[index].rotation}deg` },
                  ],
                },
              ]}
            >
              <Image
                source={stickerImages[index % stickerImages.length]}
                style={styles.stickerImage}
                contentFit="contain"
              />
            </Animated.View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  liveContainer: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  channelsContainer: {
    alignItems: "center",
  },
  channelSection: {
    width: "100%",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 2 / 1,
    position: "relative",
  },
  image: {
    flex: 1,
    height: undefined,
    width: "100%",
    maxWidth: "100%",
  },
  playButtonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  liveNowContainer: {
    gap: 1,
    marginTop: 1,
  },
  liveNowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveNowText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  showTitle: {
    textAlign: "center",
    marginTop: 4,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: -12,
  },
  menuButton: {
    paddingHorizontal: 7.5,
    paddingTop: 2,
    paddingBottom: 0,
    marginHorizontal: 3,
    borderWidth: 1,
  },
  buttonLink: {
    textDecorationLine: "none",
  },
  loadingIcon: {
    opacity: 0.7,
  },
  stickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 99,
  },
  sticker: {
    position: "absolute",
    width: 150,
    height: 150,
  },
  stickerImage: {
    width: "100%",
    height: "100%",
  },
});
