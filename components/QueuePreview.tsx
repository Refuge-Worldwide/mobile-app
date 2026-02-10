import { useThemeColor } from "@/hooks/useThemeColor";
import { Track, useAudioStore } from "@/store/audioStore";
import { optimizeShowImage } from "@/utils/imageOptimization";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { Swipeable } from "react-native-gesture-handler";
import TrackPlayer from "react-native-track-player";
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
    if (!currentTrack?.slug || currentTrack.isLive) {
      setShowDescription(null);
      return;
    }

    try {
      // Fetch show details by slug
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

  const handleLivePlayStop = () => {
    // Toggle play/pause for live streams
    setIsPlaying(!isPlaying);
  };

  const handleTitlePress = () => {
    if (currentTrack?.slug && !isLiveMode) {
      bottomSheetRef.current?.dismiss();

      // Always navigate to radio tab when clicking from queue preview
      router.push(`/(tabs)/radio/${currentTrack.slug}` as any);
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
          </View>

          {!isLiveMode && (
            <View
              style={[
                styles.scrubberContainer,
                { borderColor: textColor, backgroundColor },
              ]}
            >
              <DraggableScrubber
                onPlayPause={handlePlayPause}
                isPlaying={isPlaying}
                isLoading={isLoading}
              />
            </View>
          )}

          <View style={styles.showContentWrapper}>
            <View style={[styles.titleRow, { borderBottomColor: textColor }]}>
              {isLiveMode && (
                <Pressable
                  style={{ marginRight: 12, padding: 4 }}
                  onPress={handleLivePlayStop}
                  disabled={isLoading}
                  accessibilityLabel={
                    isPlaying ? "Stop live stream" : "Start live stream"
                  }
                >
                  <Icon
                    name={isPlaying ? "stop" : "play"}
                    size={24}
                    color={textColor}
                  />
                </Pressable>
              )}
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
              <Pressable style={styles.actionButton}>
                <Icon name="heart-outline" size={24} />
              </Pressable>
              <Pressable
                style={styles.viewShowButton}
                onPress={handleTitlePress}
                disabled={!currentTrack?.slug}
              >
                <ThemedText style={styles.viewShowText}>
                  {isLiveMode ? "View show" : "View show"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Queue Header */}
      <View
        style={[
          styles.queueHeader,
          { borderBottomColor: textColor, borderBottomWidth: 1 },
        ]}
      >
        <ThemedText type="subtitle" style={[styles.queueHeaderTitle]}>
          {isLiveMode ? "Next Up" : `Next Up (${queue.length})`}
        </ThemedText>
        {!isLiveMode && queue.length > 0 && (
          <Pressable onPress={clearQueue} style={styles.clearButton}>
            <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
          </Pressable>
        )}
      </View>
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
      snapPoints={["65%", "95%"]}
      enablePanDownToClose
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
    gap: 16,
    marginTop: 4,
    paddingBottom: 8,
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
});
