import { useThemeColor } from "@/hooks/useThemeColor";
import { Track, useAudioStore } from "@/store/audioStore";
import { optimizeShowImage } from "@/utils/imageOptimization";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import TrackPlayer, { State } from "react-native-track-player";
import { DraggableScrubber } from "./DraggableScrubber";
import { Icon } from "./Icon";
import { NextUp } from "./NextUp";
import { ThemedText } from "./ThemedText";

export interface QueuePreviewRef {
  present: () => void;
  dismiss: () => void;
}

export const QueuePreview = forwardRef<QueuePreviewRef>((props, ref) => {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const [showDescription, setShowDescription] = useState<string | null>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const router = useRouter();

  const {
    currentTrack,
    isPlaying,
    isLoading,
    queue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    setIsPlaying,
  } = useAudioStore();
  const isLiveMode = currentTrack?.isLive;
  const defaultBlurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

  // Use centralized image optimization from utils
  const optimizeImage = optimizeShowImage;

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  // Fetch show details when sheet opens
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        fetchShowDetails();
      }
    },
    [currentTrack],
  );

  const fetchShowDetails = async () => {
    if (!currentTrack?.slug) {
      setShowDescription(null);
      return;
    }

    try {
      // Fetch show details by slug (works for both live and archive)
      const response = await fetch(
        `https://refugeworldwide.com/api/shows/${currentTrack.slug}`,
      );
      if (response.ok) {
        const data = await response.json();
        setShowDescription(data.show?.description || null);
      }
    } catch (error) {
      console.error("Error fetching show details:", error);
      setShowDescription(null);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.8}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleRemove = (trackIndex: number) => {
    removeFromQueue(trackIndex);
  };

  const handleReorder = ({ data }: { data: Track[] }) => {
    reorderQueue(data);
  };

  const handlePlayPause = async () => {
    const state = await TrackPlayer.getState();
    if (state === "playing") {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleSkipBackward = async () => {
    try {
      const state = await TrackPlayer.getState();
      const wasPlaying = state === State.Playing;
      const position = await TrackPlayer.getPosition();
      const newPosition = Math.max(0, position - 30);

      // Seek and resume playback only if it was playing
      TrackPlayer.seekTo(newPosition).then(() => {
        if (wasPlaying) {
          TrackPlayer.play();
        }
      });
    } catch (error) {
      console.error("Skip backward failed:", error);
    }
  };

  const handleSkipForward = async () => {
    try {
      const state = await TrackPlayer.getState();
      const wasPlaying = state === State.Playing;
      const position = await TrackPlayer.getPosition();
      const duration = await TrackPlayer.getDuration();
      const newPosition = Math.min(duration, position + 30);

      // Seek and resume playback only if it was playing
      TrackPlayer.seekTo(newPosition).then(() => {
        if (wasPlaying) {
          TrackPlayer.play();
        }
      });
    } catch (error) {
      console.error("Skip forward failed:", error);
    }
  };

  const handleLivePlayStop = () => {
    // Toggle play/pause for live streams
    setIsPlaying(!isPlaying);
  };

  const handleSoundCloudPress = async () => {
    if (currentTrack?.url?.includes("soundcloud.com")) {
      await WebBrowser.openBrowserAsync(currentTrack.url);
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;

    try {
      const shareUrl = currentTrack.slug
        ? `https://refugeworldwide.com/radio/${currentTrack.slug}`
        : currentTrack.url;

      const shareMessage = `🎵 Check out ${currentTrack.title} on Refuge Worldwide`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleTitlePress = () => {
    if (currentTrack?.slug) {
      bottomSheetRef.current?.dismiss();

      // Navigate to the appropriate tab based on mode
      if (isLiveMode) {
        router.push(`/live/show/${currentTrack.slug}` as any);
      } else {
        router.push(`/(tabs)/radio/${currentTrack.slug}` as any);
      }
    }
  };

  const renderHeader = () => (
    <View>
      {/* Current Show Info */}
      {currentTrack && (
        <View>
          <View style={styles.imageContainer}>
            {currentTrack.artwork ? (
              <Image
                source={{ uri: optimizeShowImage(currentTrack.artwork) }}
                placeholder={{ blurhash: defaultBlurhash }}
                transition={300}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.image, { backgroundColor: textColor }]} />
            )}

            {/* Play button and skip buttons inside image */}
            <View style={styles.buttonContainer}>
              {!isLiveMode && (
                <Pressable
                  style={[styles.iconButton, { backgroundColor: textColor }]}
                  onPress={handleSkipBackward}
                  accessibilityLabel="Skip backward 30 seconds"
                >
                  <Icon name="skip-backward" size={32} color={backgroundColor} />
                </Pressable>
              )}
              <Pressable
                style={[styles.iconButton, { backgroundColor: textColor }]}
                onPress={isLiveMode ? handleLivePlayStop : handlePlayPause}
                disabled={isLoading}
                accessibilityLabel={
                  isLiveMode
                    ? (isPlaying ? "Stop live stream" : "Start live stream")
                    : (isPlaying ? "Pause" : "Play")
                }
              >
                {isLoading ? (
                  <Icon name="loading" size={24} color={backgroundColor} />
                ) : (
                  <Icon
                    name={isLiveMode ? (isPlaying ? "stop" : "play") : (isPlaying ? "pause" : "play")}
                    size={40}
                    color={backgroundColor}
                  />
                )}
              </Pressable>
              {!isLiveMode && (
                <Pressable
                  style={[styles.iconButton, { backgroundColor: textColor }]}
                  onPress={handleSkipForward}
                  accessibilityLabel="Skip forward 30 seconds"
                >
                  <Icon name="skip-forward" size={32} color={backgroundColor} />
                </Pressable>
              )}
            </View>
          </View>

          {!isLiveMode && (
            <View
              style={[
                styles.scrubberContainer,
                { borderColor: textColor, backgroundColor },
              ]}
            >
              <DraggableScrubber />
            </View>
          )}

          <View style={styles.showContentWrapper}>
            <View style={[styles.titleRow, { borderBottomColor: textColor }]}>
              <Pressable
                style={styles.titlePressable}
                onPress={handleTitlePress}
                disabled={!currentTrack?.slug}
              >
                <ThemedText>{currentTrack.title}</ThemedText>
              </Pressable>
            </View>

            {showDescription && (
              <View style={styles.descriptionContainer}>
                <ThemedText numberOfLines={3}>{showDescription}</ThemedText>
              </View>
            )}

            <View style={styles.actionButtons}>
              <View style={styles.actionButtonsLeft}>
                <Pressable
                  style={styles.actionButton}
                  accessibilityLabel="Add to favorites"
                  accessibilityRole="button"
                >
                  <Icon name="heart-outline" size={24} />
                </Pressable>
                {currentTrack?.url?.includes("soundcloud.com") && (
                  <Pressable
                    style={styles.actionButton}
                    onPress={handleSoundCloudPress}
                    accessibilityLabel="Open on SoundCloud"
                    accessibilityRole="button"
                  >
                    <FontAwesome5 name="soundcloud" size={24} color={textColor} />
                  </Pressable>
                )}
                <Pressable
                  style={styles.actionButton}
                  onPress={handleShare}
                  accessibilityLabel="Share this track"
                  accessibilityRole="button"
                >
                  <Icon name="share" size={24} color={textColor} />
                </Pressable>
              </View>
              <Pressable
                style={styles.viewShowButton}
                onPress={handleTitlePress}
                disabled={!currentTrack?.slug}
              >
                <ThemedText style={styles.viewShowText}>View show</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Queue Header */}
      {isLiveMode ? (
        <View style={[styles.dateHeader, { backgroundColor: textColor }]}>
          <ThemedText style={[styles.dateText, { color: backgroundColor }]}>
            Next Up
          </ThemedText>
        </View>
      ) : (
        <View
          style={[
            styles.queueHeader,
            { borderBottomColor: textColor, borderBottomWidth: 1 },
          ]}
        >
          <ThemedText type="subtitle" style={[styles.queueHeaderTitle]}>
            Next Up ({queue.length})
          </ThemedText>
          {queue.length > 0 && (
            <Pressable onPress={clearQueue} style={styles.clearButton}>
              <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<Track>) => {
    const index = getIndex() ?? 0;
    const imageUri = item.artwork ? optimizeImage(item.artwork) : null;

    const handleQueueItemPress = async () => {
      if (!item.slug) return;

      // Close the bottom sheet
      bottomSheetRef.current?.dismiss();

      // Navigate to the show page
      if (item.isLive) {
        router.push(`/(tabs)/live/show/${item.slug}` as any);
      } else {
        router.push(`/(tabs)/radio/${item.slug}` as any);
      }
    };

    return (
      <ScaleDecorator>
        <Swipeable
          renderRightActions={() => (
            <View style={[styles.deleteAction, { backgroundColor: "#ff3b30" }]}>
              <Ionicons name="trash" size={24} color="white" />
            </View>
          )}
          onSwipeableOpen={() => handleRemove(index)}
          overshootRight={false}
        >
          <Pressable
            onPress={handleQueueItemPress}
            onLongPress={drag}
            disabled={isActive}
            style={[
              styles.queueItem,
              { borderBottomColor: textColor, backgroundColor },
              isActive && styles.queueItemDragging,
            ]}
          >
            <View style={styles.queueImageContainer}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.queueImage}
                  contentFit="cover"
                  placeholder={{ blurhash: defaultBlurhash }}
                  transition={200}
                />
              ) : (
                <View
                  style={[styles.queueImage, { backgroundColor: textColor }]}
                />
              )}
            </View>
            <View style={styles.queueTitleContainer}>
              <ThemedText numberOfLines={2} style={styles.queueTitle}>
                {item.title}
              </ThemedText>
            </View>
            <View style={styles.dragHandle}>
              <Ionicons name="menu" size={24} color={textColor} />
            </View>
          </Pressable>
        </Swipeable>
      </ScaleDecorator>
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["65%", "80%"]}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
      handleIndicatorStyle={{ backgroundColor: textColor }}
      onChange={handleSheetChange}
    >
      <BottomSheetScrollView contentContainerStyle={styles.flatListContent}>
        {renderHeader()}
        {isLiveMode ? (
          <NextUp />
        ) : queue.length > 0 ? (
          <DraggableFlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderItem}
            onDragEnd={handleReorder}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No shows in queue</ThemedText>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

QueuePreview.displayName = "QueuePreview";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  flatListContent: {
    paddingBottom: 32,
    paddingHorizontal: 12,
  },
  emptyDrawer: {
    flex: 1,
  },
  // Image at top - no padding
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
  // Content wrapper
  showContentWrapper: {
    paddingBottom: 24,
  },
  // Title row - full width
  titleRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
    paddingTop: 6,
  },
  titlePressable: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
    paddingTop: 6,
  },
  // Padded content area
  paddedContent: {
    // paddingHorizontal handled by showContentWrapper
  },
  // Scrubber - positioned below image
  scrubberContainer: {
    borderBottomWidth: 1,
    overflow: "hidden",
    // backgroundColor set inline with theme color
  },
  skipButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  skipButton: {
    padding: 8,
  },
  scrubberWrapper: {
    flex: 1,
  },
  // Description
  descriptionContainer: {
    marginTop: 8,
    paddingBottom: 4,
  },
  viewMoreText: {
    textDecorationLine: "underline",
  },
  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingBottom: 8,
  },
  actionButtonsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionButton: {
    padding: 0,
  },
  viewShowButton: {
    padding: 0,
  },
  viewShowText: {
    paddingTop: 3,
    textDecorationLine: "underline",
  },
  // Queue Section
  queueSection: {
    flex: 1,
    paddingTop: 0,
  },
  dateHeader: {
    alignItems: "center",
  },
  dateText: {
    fontWeight: "bold",
  },
  queueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  queueHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    opacity: 0.6,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  queueItemDragging: {
    opacity: 0.7,
    elevation: 5,
  },
  queueImageContainer: {
    width: 100,
    aspectRatio: 16 / 9,
    overflow: "hidden",
  },
  queueImage: {
    width: "100%",
    height: "100%",
  },
  queueTitleContainer: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  dragHandle: {
    padding: 4,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
  artwork: {
    width: 48,
    height: 48,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  trackArtist: {
    fontSize: 12,
    opacity: 0.7,
  },
  removeButton: {
    padding: 4,
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
});
