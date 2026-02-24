import { useThemeColor } from "@/hooks/useThemeColor";
import { useAudioStore } from "@/store/audioStore";
import { optimizeShowImage } from "@/utils/imageOptimization";
import { Image } from "expo-image";
import { useRouter, useSegments } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { GenreTag } from "./GenreTag";
import { Icon } from "./Icon";
import { ThemedText } from "./ThemedText";
import { Toast } from "./ToastNotification";

interface ShowCardProps {
  imageUrl?: string;
  blurhash?: string;
  title: string;
  date: string;
  genres: string[];
  mixcloudLink?: string;
  onPress?: () => void;
  showId?: string;
  slug?: string;
}

export function ShowCard({
  imageUrl,
  blurhash,
  title,
  date,
  genres,
  mixcloudLink,
  onPress,
  showId,
  slug,
}: ShowCardProps) {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();
  const segments = useSegments();

  const displayGenres = genres.slice(0, 3);

  // Determine which tab we're in
  // segments structure varies:
  // - Root tab: ['(tabs)', 'live']
  // - Nested: ['(tabs)', 'live', 'show', 'slug-value']
  // We need to find the tab name (radio, live, search, etc.)
  const currentTab = (() => {
    const segmentStrings = segments as string[];
    const tabsIndex = segmentStrings.indexOf('(tabs)');
    if (tabsIndex !== -1 && segmentStrings.length > tabsIndex + 1) {
      const tabName = segmentStrings[tabsIndex + 1];
      // Make sure it's a valid tab name, not a subroute
      if (['radio', 'live', 'search', 'playlist', 'account'].includes(tabName)) {
        return tabName;
      }
    }
    return 'radio'; // Default fallback
  })();

  // Default navigation for show card
  const handleDefaultPress = () => {
    if (slug) {
      router.push(`/(tabs)/${currentTab}/show/${slug}` as any);
    }
  };

  const defaultBlurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

  // Use centralized image optimization from utils
  const optimizeImage = optimizeShowImage;

  const setTrack = useAudioStore((state) => state.setTrack);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);
  const addToQueue = useAudioStore((state) => state.addToQueue);
  const currentTrack = useAudioStore((state) => state.currentTrack);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const isLoading = useAudioStore((state) => state.isLoading);

  const effectiveAudioUrl = mixcloudLink?.includes("soundcloud.com") ? mixcloudLink : undefined;

  // Check if this specific show is currently playing or loading
  const isThisShowPlaying =
    showId && currentTrack?.showId === showId && isPlaying;
  const isThisShowLoading =
    showId && currentTrack?.showId === showId && isLoading;

  const handlePlayPress = async (e: any) => {
    e.stopPropagation();
    if (!effectiveAudioUrl) return;

    // If this show is already the current track, just resume playback
    if (showId && currentTrack?.showId === showId) {
      setIsPlaying(true);
      return;
    }

    // Otherwise load the new track
    setTrack({
      id: title,
      url: effectiveAudioUrl,
      title: title,
      artist: date,
      artwork: imageUrl,
      mode: "archive",
      isLive: false,
      showId: showId,
      slug: slug,
    });
  };

  const handlePausePress = (e: any) => {
    e.stopPropagation();
    setIsPlaying(false);
  };

  const handleQueuePress = async (e: any) => {
    e.stopPropagation();
    if (effectiveAudioUrl) {
      try {
        // Add to store queue only
        addToQueue({
          id: title,
          url: effectiveAudioUrl,
          title: title,
          artist: date,
          artwork: imageUrl,
          mode: "archive",
          isLive: false,
          showId: showId,
          slug: slug,
        });

        // Show success notification
        Toast.show({
          type: "success",
          text1: "Show added to queue",
        });
      } catch (error) {
        console.error("Error adding to queue:", error);

        // Show error notification
        Toast.show({
          type: "error",
          text1: "Failed to add to queue",
          text2: "Please try again",
        });
      }
    }
  };

  return (
    <Pressable onPress={onPress || handleDefaultPress}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: optimizeImage(imageUrl) }}
            placeholder={{ blurhash: blurhash || defaultBlurhash }}
            transition={300}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.image, { backgroundColor: textColor }]} />
        )}

        <View style={styles.buttonContainer}>
          {effectiveAudioUrl && (
            <>
              <Pressable
                style={[styles.iconButton, { backgroundColor: textColor }]}
                onPress={isThisShowPlaying ? handlePausePress : handlePlayPress}
                disabled={!!isThisShowLoading}
              >
                {isThisShowLoading ? (
                  <Icon name="loading" size={24} color={backgroundColor} />
                ) : (
                  <Icon
                    name={isThisShowPlaying ? "pause" : "play"}
                    size={40}
                    color={backgroundColor}
                  />
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.iconButton,
                  { backgroundColor: textColor, marginLeft: -8 },
                ]}
                onPress={handleQueuePress}
              >
                <Icon name="plus" size={40} color={backgroundColor} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={[styles.infoRow, { borderBottomColor: textColor }]}>
        <View style={[styles.dateBox, { backgroundColor: textColor }]}>
          <ThemedText
            style={{
              color: backgroundColor,
              paddingTop: 2,
              marginBottom: -1.5,
            }}
          >
            {date}
          </ThemedText>
        </View>
        <View style={[styles.titleContainer, { paddingTop: 6 }]}>
          <ThemedText>{title}</ThemedText>
        </View>
      </View>

      {displayGenres.length > 0 && (
        <View style={styles.genresContainer}>
          {displayGenres.map((genre, index) => (
            <GenreTag
              key={`${genre}-${index}`}
              name={genre}
              onPress={() => {
                // Route to genre page within the current tab
                const genrePath = `/(tabs)/${currentTab || "radio"}/genre/${encodeURIComponent(genre)}`;
                router.push(genrePath as any);
              }}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    marginTop: 0,
    borderBottomWidth: 1,
  },
  dateBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 4,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
});
