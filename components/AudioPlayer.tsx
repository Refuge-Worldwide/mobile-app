import { useThemeColor } from "@/hooks/useThemeColor";
import { fetchShowBySlug } from "@/lib/showsApi";
import { useAudioStore } from "@/store/audioStore";
import { optimizeShowImage } from "@/utils/imageOptimization";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DraggableScrubber } from "./DraggableScrubber";
import { Icon } from "./Icon";
import { QueuePreview, QueuePreviewRef } from "./QueuePreview";
import { ThemedText } from "./ThemedText";

// All TrackPlayer orchestration (setup, loading, play/pause reconciliation,
// remote controls) lives in lib/playbackController.ts, which is wired up
// once at app boot. This component only reads the store and renders UI.

export function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    setIsPlaying,
    clearTrack,
    queue,
    addToQueue,
  } = useAudioStore();
  // Endless playback: auto-queue all related shows if queue is empty when a show starts
  useEffect(() => {
    const autoQueueRelated = async () => {
      if (!currentTrack || !currentTrack.slug || !currentTrack.showId) return;
      if (queue.length > 0) return;
      if (currentTrack.isLive) return;
      const show = await fetchShowBySlug(currentTrack.slug);
      if (show && show.relatedShows && show.relatedShows.length > 0) {
        // Only add shows with a SoundCloud mixcloudLink, not already in queue, and not the current show
        const alreadyQueuedIds = new Set(queue.map((t) => t.showId));
        const relatedToAdd = show.relatedShows.filter(
          (s) =>
            s.slug !== currentTrack.slug &&
            !!s.mixcloudLink?.includes("soundcloud.com") &&
            !alreadyQueuedIds.has(s.id),
        );
        if (relatedToAdd.length > 0) {
          // Fetch each related show details to get mixcloudLink
          for (const relatedShow of relatedToAdd) {
            const fullShow = await fetchShowBySlug(relatedShow.slug);
            if (fullShow && fullShow.mixcloudLink?.includes("soundcloud.com")) {
              addToQueue({
                id: fullShow.id,
                url: fullShow.mixcloudLink,
                title: fullShow.title,
                artist: fullShow.artists?.map((a) => a.name).join(", ") || "",
                artwork: fullShow.artwork || fullShow.coverImage,
                mode: "archive",
                isLive: false,
                showId: fullShow.id,
                slug: fullShow.slug,
              });
            }
          }
        }
      }
    };
    autoQueueRelated();
    // Only run when currentTrack changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const [isVisible, setIsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Calculate bottom position: tab bar height (paddingTop 6 + 2 rows ~24px each + margin/padding ~12px + safe area)
  // Move up 50px if on live tab to sit above the Chat/Schedule buttons
  const tabBarHeight = 80 + Math.max(insets.bottom, 11);

  const queueSheetRef = useRef<QueuePreviewRef>(null);
  const slideAnim = useRef(new Animated.Value(100)).current; // Start below screen
  const isLiveMode = currentTrack?.isLive;
  const defaultBlurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

  // Animation functions
  const slideUp = useCallback(() => {
    setIsVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const slideDown = useCallback(
    (callback?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        callback?.();
      });
    },
    [slideAnim],
  );

  // Show/hide player when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      slideUp();
    } else {
      slideDown();
    }
  }, [currentTrack, slideUp, slideDown]);

  // Fetch and update live show metadata periodically when live stream is loaded
  useEffect(() => {
    if (!currentTrack?.isLive) return;

    const fetchAndUpdateLiveShow = async () => {
      try {
        const res = await fetch("https://refugeworldwide.com/api/schedule");
        const data = await res.json();

        const { updateLiveTrackMetadata } = useAudioStore.getState();

        if (currentTrack.id === "live-stream" && data.liveNow) {
          // Update Channel 1 metadata only (no playback change)
          updateLiveTrackMetadata({
            title: data.liveNow.title,
            artwork: data.liveNow.artwork,
            showId: data.liveNow.slug || "live-stream",
            slug: data.liveNow.slug,
          });
        } else if (currentTrack.id === "live-stream-ch2" && data.ch2) {
          // Update Channel 2 metadata only (no playback change)
          updateLiveTrackMetadata({
            title: data.ch2.liveNow,
            artwork: data.liveNow?.artwork,
            showId: "live-stream-ch2",
            slug: undefined, // Channel 2 doesn't have show details
          });
        }
      } catch (error) {
        console.error("Error fetching live show data:", error);
      }
    };

    // Fetch immediately
    fetchAndUpdateLiveShow();

    // Set up interval to fetch every 30 seconds
    const interval = setInterval(fetchAndUpdateLiveShow, 30000);

    return () => clearInterval(interval);
  }, [currentTrack?.isLive, currentTrack?.id]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLivePlayStop = () => {
    // Toggle play/pause for live streams
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    slideDown(() => {
      clearTrack();
    });
  };

  // Don't render anything if no track and not visible
  if (!currentTrack && !isVisible) return null;

  return (
    <>
      <QueuePreview ref={queueSheetRef} />
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            borderTopColor: textColor,
            bottom: tabBarHeight,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.content}>
          {/* Left side - Show image */}
          {currentTrack?.artwork && (
            <Pressable
              style={styles.imageContainer}
              onPress={() => queueSheetRef.current?.present()}
              accessibilityLabel="Open queue and show details"
              accessibilityRole="button"
            >
              <Image
                source={{ uri: optimizeShowImage(currentTrack.artwork) }}
                placeholder={{ blurhash: defaultBlurhash }}
                transition={200}
                style={styles.artwork}
                contentFit="cover"
              />
            </Pressable>
          )}

          {/* Middle - Track info and controls */}
          <View style={styles.middleContainer}>
            {!isLiveMode ? (
              <View style={styles.controlsWrapper}>
                <DraggableScrubber
                  onPlayPause={handlePlayPause}
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                />

                {/* Queue button */}
                <Pressable
                  onPress={() => queueSheetRef.current?.present()}
                  style={styles.queueButtonExternal}
                  accessibilityLabel="Open queue"
                  accessibilityRole="button"
                >
                  <Ionicons name="list" size={18} color={textColor} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.controlsRow}>
                <Pressable
                  onPress={handleLivePlayStop}
                  disabled={isLoading}
                  style={styles.playButton}
                  testID={isPlaying ? "stop-button" : "play-button"}
                  accessibilityLabel={isPlaying ? "Stop live stream" : "Start live stream"}
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <Icon name="loading" size={24} color={textColor} />
                  ) : (
                    <Icon
                      name={isPlaying ? "stop" : "play"}
                      size={24}
                      color={textColor}
                    />
                  )}
                </Pressable>

                {/* Show title for live streams */}
                <Pressable
                  onPress={() => queueSheetRef.current?.present()}
                  style={styles.liveTitleContainer}
                  accessibilityLabel="Open queue and show details"
                  accessibilityRole="button"
                >
                  <ThemedText numberOfLines={1}>
                    {currentTrack?.title}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 100,
    borderTopWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 0,
    height: 40,
  },
  imageContainer: {
    width: 71, // 16:9 aspect ratio with height of 40
    height: 40,
    overflow: "hidden",
    marginRight: 0,
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  middleContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 0,
  },
  leftContainer: {
    flex: 1,
    justifyContent: "space-between",
    gap: 0,
  },
  leftContainerFullWidth: {
    marginRight: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  titleContainer: {
    height: 27,
    justifyContent: "center",
    marginBottom: 1,
  },
  title: {
    paddingHorizontal: 4,
  },
  controlsWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    height: 40,
  },
  queueButtonExternal: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 40,
    zIndex: 2,
  },
  scrubberRow: {
    position: "relative",
    height: 40,
    overflow: "hidden",
    flex: 1,
  },
  scrubberFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100%",
    zIndex: 1,
  },
  scrubberContentLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  scrubberInvertedLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100%",
    overflow: "hidden",
    zIndex: 3,
  },
  scrubberInvertedContent: {
    position: "relative",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  scrubberPlayButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  scrubberPlayButtonInverted: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  scrubberQueueButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
    position: "relative",
  },
  scrubberCloseButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
  },
  queueBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  queueBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  scrubberTimeContainer: {
    position: "absolute",
    right: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scrubberTimeContainerInverted: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scrubberButtonsContainer: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scrubberButtonsContainerInverted: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scrubberButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  scrubberTime: {
    textAlign: "right",
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
  },
  artist: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: -2,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    marginLeft: 4,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    fontSize: 12,
    minWidth: 45,
    textAlign: "right",
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: "center",
  },
  progressBarBackground: {
    height: 24,
    borderWidth: 1,
    position: "relative",
    justifyContent: "center",
    overflow: "hidden",
  },
  progressBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100%",
  },
  timeTextContainer: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  timeTextOverlay: {
    fontSize: 12,
    fontWeight: "500",
    zIndex: 1,
  },
  timeTextInverted: {
    position: "absolute",
    right: 0,
  },
  playButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  queueButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  liveIndicatorContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveIndicatorText: {},
  externalButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 4,
  },
  externalButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  liveTitleContainer: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: 4,
  },
});
