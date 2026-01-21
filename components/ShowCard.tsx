import { useThemeColor } from "@/hooks/useThemeColor";
import { useAudioStore } from "@/store/audioStore";
import { Image } from "expo-image";
import { useRouter, useSegments } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon } from "./Icon";
import { ThemedText } from "./ThemedText";
import { Toast } from "./ToastNotification";

interface ShowCardProps {
  imageUrl?: string;
  blurhash?: string;
  title: string;
  date: string;
  genres: string[];
  audioUrl?: string;
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
  audioUrl,
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
  // segments structure: ['', '(tabs)', 'radio'|'live'|'search', ...]
  // Get the tab name: could be 'radio', 'live', 'search', etc.
  const currentTab = (() => {
    if (segments.length > 2 && segments[1] === '(tabs)') {
      return segments[2];
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

  const optimizeImage = (src: string | undefined): string => {
    if (!src) return "";

    const imageUrl = src.startsWith("//") ? `https:${src}` : src;

    if (
      !imageUrl.includes("ctfassets.net") &&
      !imageUrl.includes("contentful.com")
    ) {
      return imageUrl;
    }

    return `${imageUrl}?w=590&h=332&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`;
  };

  const setTrack = useAudioStore((state) => state.setTrack);
  const stopTrack = useAudioStore((state) => state.stopTrack);
  const addToQueue = useAudioStore((state) => state.addToQueue);
  const currentTrack = useAudioStore((state) => state.currentTrack);
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const isLoading = useAudioStore((state) => state.isLoading);

  // Check if this specific show is currently playing or loading
  const isThisShowPlaying =
    showId && currentTrack?.showId === showId && isPlaying;
  const isThisShowLoading =
    showId && currentTrack?.showId === showId && isLoading;

  const handlePlayPress = (e: any) => {
    e.stopPropagation();
    if (audioUrl) {
      setTrack({
        id: title,
        url: audioUrl,
        title: title,
        artist: date,
        artwork: imageUrl,
        mode: "archive",
        isLive: false,
        showId: showId,
        slug: slug,
      });
    }
  };

  const handlePausePress = (e: any) => {
    e.stopPropagation();
    stopTrack();
  };

  const handleQueuePress = async (e: any) => {
    e.stopPropagation();
    if (audioUrl) {
      try {
        // Add to store queue only
        addToQueue({
          id: title,
          url: audioUrl,
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
          {audioUrl && (
            <>
              <Pressable
                style={[styles.iconButton, { backgroundColor: textColor }]}
                onPress={isThisShowPlaying ? handlePausePress : handlePlayPress}
                disabled={isThisShowLoading}
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
            <Pressable
              key={`${genre}-${index}`}
              style={[styles.genreTag, { borderColor: textColor }]}
              onPress={(e) => {
                e.stopPropagation();
                // Route to genre page within the current tab
                const genrePath = `/(tabs)/${currentTab || "radio"}/genre/${encodeURIComponent(genre)}`;
                router.push(genrePath as any);
              }}
            >
              <ThemedText type="tag">{genre}</ThemedText>
            </Pressable>
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
  genreTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
});
