import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioStore } from '@/store/audioStore';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import TrackPlayer, { Track, useProgress } from 'react-native-track-player';
import { Icon } from './Icon';
import { ThemedText } from './ThemedText';

export interface QueuePreviewRef {
  present: () => void;
  dismiss: () => void;
}

export const QueuePreview = forwardRef<QueuePreviewRef>((props, ref) => {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [queue, setQueue] = useState<Track[]>([]);
  const [progressBarWidth, setProgressBarWidth] = useState(300);
  const [showDescription, setShowDescription] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionLong, setIsDescriptionLong] = useState(false);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const { currentTrack, isPlaying, isLoading, playbackMode } = useAudioStore();
  const { position, duration } = useProgress();
  const isLiveMode = playbackMode === 'live' || currentTrack?.isLive;
  const defaultBlurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

  const optimizeImage = (src: string | undefined): string => {
    if (!src) return '';

    const imageUrl = src.startsWith('//') ? `https:${src}` : src;

    if (!imageUrl.includes('ctfassets.net') && !imageUrl.includes('contentful.com')) {
      return imageUrl;
    }

    return `${imageUrl}?w=590&h=332&q=80&fm=jpg&fl=progressive&f=faces&fit=fill`;
  };

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  // Fetch queue and show details when sheet opens
  const handleSheetChange = useCallback((index: number) => {
    if (index >= 0) {
      loadQueue();
      fetchShowDetails();
    }
  }, [currentTrack]);

  const fetchShowDetails = async () => {
    if (!currentTrack?.slug || currentTrack.isLive) {
      setShowDescription(null);
      return;
    }

    try {
      // Fetch show details by slug
      const response = await fetch(`https://refugeworldwide.com/api/shows/${currentTrack.slug}`);
      if (response.ok) {
        const data = await response.json();
        setShowDescription(data.show?.description || null);
      }
    } catch (error) {
      console.error('Error fetching show details:', error);
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
    []
  );

  const loadQueue = async () => {
    try {
      const currentQueue = await TrackPlayer.getQueue();
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();

      // Only show tracks after the current one
      if (currentTrackIndex !== null && currentTrackIndex !== undefined) {
        const upcomingTracks = currentQueue.slice(currentTrackIndex + 1);
        setQueue(upcomingTracks);
      } else {
        setQueue(currentQueue);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
      setQueue([]);
    }
  };

  const handleRemove = async (trackIndex: number) => {
    try {
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      // Calculate actual index in the full queue
      const actualIndex = currentTrackIndex !== null && currentTrackIndex !== undefined
        ? currentTrackIndex + 1 + trackIndex
        : trackIndex;

      await TrackPlayer.remove(actualIndex);
      await loadQueue(); // Refresh the queue display
    } catch (error) {
      console.error('Error removing track:', error);
    }
  };

  const handleReorder = async ({ data }: { data: Track[] }) => {
    try {
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();

      // Update local state immediately for smooth UI
      setQueue(data);

      // Reorder in TrackPlayer
      // Remove all upcoming tracks and re-add in new order
      if (currentTrackIndex !== null && currentTrackIndex !== undefined) {
        // Get the full queue
        const fullQueue = await TrackPlayer.getQueue();
        const currentAndPastTracks = fullQueue.slice(0, currentTrackIndex + 1);

        // Reset queue with current/past tracks + reordered upcoming tracks
        await TrackPlayer.reset();
        await TrackPlayer.add([...currentAndPastTracks, ...data]);

        // Set active track back to what was playing
        await TrackPlayer.skip(currentTrackIndex);
      }
    } catch (error) {
      console.error('Error reordering queue:', error);
      await loadQueue(); // Reload on error
    }
  };

  const handleSeekComplete = async (value: number) => {
    await TrackPlayer.seekTo(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const state = await TrackPlayer.getState();
    if (state === 'playing') {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['85%', '95%']}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor }}
      handleIndicatorStyle={{ backgroundColor: textColor }}
      onChange={handleSheetChange}
    >
      <View style={styles.container}>
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {/* Current Show Info - Image at top with scrubber overlay */}
          {currentTrack && (
            <>
              {/* Show Image Container (16:9) with scrubber overlay at bottom */}
              <View style={styles.imageContainer}>
                {currentTrack.artwork ? (
                  <Image
                    source={{ uri: currentTrack.artwork }}
                    placeholder={{ blurhash: defaultBlurhash }}
                    transition={300}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.image, { backgroundColor: textColor }]} />
                )}

                {/* Top gradient fade overlay */}
                <LinearGradient
                  colors={[backgroundColor, 'transparent']}
                  style={styles.topGradient}
                />

                {/* Timeline Scrubber overlaid at bottom of image (only for archive mode) */}
                {!isLiveMode && (
                  <View style={[styles.scrubberContainer, { borderColor: textColor, backgroundColor: `${backgroundColor}CC` }]}>
                    <Pressable
                      style={styles.scrubberRow}
                      onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                      onPress={(e) => {
                        const { locationX } = e.nativeEvent;
                        const percentage = locationX / progressBarWidth;
                        const newPosition = percentage * duration;
                        handleSeekComplete(newPosition);
                      }}
                    >
                      {/* Progress fill */}
                      <View
                        style={[
                          styles.scrubberFill,
                          {
                            backgroundColor: textColor,
                            width: `${((position / (duration || 1)) * 100)}%`,
                          },
                        ]}
                      />

                      {/* UI Elements layer */}
                      <View style={styles.scrubberContentLayer} pointerEvents="box-none">
                        {/* Play button */}
                        <Pressable
                          onPress={handlePlayPause}
                          disabled={isLoading}
                          style={styles.scrubberPlayButton}
                        >
                          {isLoading ? (
                            <Icon name="loading" size={20} color={textColor} />
                          ) : (
                            <Ionicons
                              name={isPlaying ? 'pause' : 'play'}
                              size={20}
                              color={textColor}
                            />
                          )}
                        </Pressable>

                        {/* Time text */}
                        <View style={styles.scrubberTimeContainer} pointerEvents="none">
                          <ThemedText style={[styles.scrubberTime, { color: textColor }]}>
                            {formatTime(position)} / {formatTime(duration)}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Inverted UI Elements layer */}
                      <View
                        style={[
                          styles.scrubberInvertedLayer,
                          {
                            width: `${((position / (duration || 1)) * 100)}%`,
                          },
                        ]}
                        pointerEvents="box-none"
                      >
                        <View style={[styles.scrubberInvertedContent, { width: progressBarWidth }]}>
                          {/* Play button inverted */}
                          <View style={styles.scrubberPlayButtonInverted}>
                            <Pressable
                              onPress={handlePlayPause}
                              disabled={isLoading}
                              style={styles.scrubberPlayButton}
                            >
                              {isLoading ? (
                                <Icon name="loading" size={20} color={backgroundColor} />
                              ) : (
                                <Ionicons
                                  name={isPlaying ? 'pause' : 'play'}
                                  size={20}
                                  color={backgroundColor}
                                />
                              )}
                            </Pressable>
                          </View>

                          {/* Time text inverted */}
                          <View style={styles.scrubberTimeContainerInverted} pointerEvents="none">
                            <ThemedText style={[styles.scrubberTime, { color: backgroundColor }]}>
                              {formatTime(position)} / {formatTime(duration)}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Content below image - full width */}
              <View style={styles.showContentWrapper}>
                {/* Title Row - Full Width */}
                <View style={[styles.titleRow, { borderBottomColor: textColor }]}>
                  <View style={[styles.dateBox, { backgroundColor: textColor }]}>
                    <ThemedText style={{ color: backgroundColor, paddingTop: 2, marginBottom: -1.5 }}>
                      {currentTrack.artist || 'Unknown'}
                    </ThemedText>
                  </View>
                  <View style={styles.titleContainer}>
                    <ThemedText>
                      {currentTrack.title}
                    </ThemedText>
                  </View>
                </View>

                {/* Padded Content Area */}
                <View style={styles.paddedContent}>
                  {/* Description */}
                  {showDescription && (
                    <View style={styles.descriptionContainer}>
                      <ThemedText
                        numberOfLines={isDescriptionExpanded ? undefined : 5}
                        onTextLayout={(e) => {
                          if (e.nativeEvent.lines.length > 5) {
                            setIsDescriptionLong(true);
                          }
                        }}
                      >
                        {showDescription}
                      </ThemedText>
                      {isDescriptionLong && (
                        <Pressable
                          onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          style={styles.viewMoreButton}
                        >
                          <ThemedText style={[styles.viewMoreText, { color: textColor }]}>
                            {isDescriptionExpanded ? 'View less' : 'View more'}
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <Pressable style={styles.actionButton}>
                      <Icon
                        name="heart-outline"
                        size={24}
                      />
                    </Pressable>
                    <Pressable style={styles.actionButton}>
                      <Icon name="share" size={24} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Queue Section */}
          <View style={styles.queueSection}>
            <View style={styles.queueHeader}>
              <ThemedText type="subtitle" style={styles.queueHeaderTitle}>
                Up Next ({queue.length})
              </ThemedText>
            </View>

            {queue.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No tracks in queue</ThemedText>
              </View>
            ) : (
              <DraggableFlatList
                data={queue}
                onDragEnd={handleReorder}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item, drag, isActive, getIndex }) => {
                  const index = getIndex() ?? 0;
                  return (
                    <ScaleDecorator>
                      <Swipeable
                        renderRightActions={() => (
                          <View style={[styles.deleteAction, { backgroundColor: '#ff3b30' }]}>
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
                            isActive && styles.queueItemDragging
                          ]}
                        >
                          <View style={styles.queueImageContainer}>
                            {item.artwork ? (
                              <Image
                                source={{ uri: optimizeImage(item.artwork) }}
                                style={styles.queueImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={[styles.queueImage, { backgroundColor: textColor }]} />
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
                }}
                containerStyle={{ flex: 0 }}
                scrollEnabled={false}
              />
            )}
          </View>
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
});

QueuePreview.displayName = 'QueuePreview';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  // Image at top - no padding
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Top gradient fade
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  // Content wrapper
  showContentWrapper: {
    paddingBottom: 24,
  },
  // Title row - full width
  titleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
    borderBottomWidth: 1,
  },
  dateBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 4,
    paddingTop: 6,
  },
  // Padded content area
  paddedContent: {
    paddingHorizontal: 12,
  },
  // Scrubber - positioned at bottom of image with semi-transparent background
  scrubberContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    overflow: 'hidden',
    // backgroundColor set inline with theme color + opacity
  },
  scrubberRow: {
    position: 'relative',
    height: 40,
    overflow: 'hidden',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 1,
  },
  scrubberContentLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  scrubberInvertedLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    overflow: 'hidden',
    zIndex: 3,
  },
  scrubberInvertedContent: {
    position: 'relative',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrubberPlayButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  scrubberPlayButtonInverted: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  scrubberTimeContainer: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubberTimeContainerInverted: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // scrubberTime: {
  //   fontSize: 12,
  //   textAlign: 'right',
  // },
  // Description
  descriptionContainer: {
    marginTop: 4,
  },
  viewMoreButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  actionButton: {
    padding: 8,
  },
  // Queue Section
  queueSection: {
    paddingTop: 8,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  queueHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    opacity: 0.6,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  queueItemDragging: {
    opacity: 0.7,
    elevation: 5,
  },
  queueImageContainer: {
    width: 80,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  queueImage: {
    width: '100%',
    height: '100%',
  },
  queueTitleContainer: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  dragHandle: {
    padding: 4,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
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
    fontWeight: '500',
  },
  trackArtist: {
    fontSize: 12,
    opacity: 0.7,
  },
  removeButton: {
    padding: 4,
  },
});
