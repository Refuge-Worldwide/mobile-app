import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioStore } from '@/store/audioStore';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import TrackPlayer, { AppKilledPlaybackBehavior, Capability, Event, State, useProgress, useTrackPlayerEvents } from 'react-native-track-player';
import { Icon } from './Icon';
import { QueuePreview, QueuePreviewRef } from './QueuePreview';
import { ThemedText } from './ThemedText';

export function AudioPlayer() {
  const { currentTrack, isPlaying, isLoading, setIsPlaying, setIsLoading, clearTrack, stopTrack, playbackMode } = useAudioStore();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const { position, duration } = useProgress();
  const [isVisible, setIsVisible] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(300);

  const queueSheetRef = useRef<QueuePreviewRef>(null);
  const slideAnim = useRef(new Animated.Value(100)).current; // Start below screen
  const isLiveMode = playbackMode === 'live' || currentTrack?.isLive;
  const defaultBlurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

  // Animation functions
  const slideUp = useCallback(() => {
    setIsVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const slideDown = useCallback((callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      callback?.();
    });
  }, [slideAnim]);

  // Show/hide player when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      slideUp();
    } else {
      slideDown();
    }
  }, [currentTrack, slideUp, slideDown]);

  // Setup Track Player
  useEffect(() => {
    setupPlayer();
  }, []);

  const setupPlayer = async () => {
    try {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
      });

      // Setup remote control event handlers for lock screen
      TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        await TrackPlayer.play();
      });

      TrackPlayer.addEventListener(Event.RemotePause, async () => {
        await TrackPlayer.pause();
      });

      TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        await TrackPlayer.stop();
        clearTrack();
      });

      TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
        await TrackPlayer.seekTo(event.position);
      });
    } catch (error) {
      console.log('Error setting up player:', error);
    }
  };

  const loadTrack = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if the track is already in the queue
      const queue = await TrackPlayer.getQueue();
      const currentTrackInQueue = queue.find(track => track.id === currentTrack!.id);

      // Only reset and add if it's a different track
      if (!currentTrackInQueue) {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: currentTrack!.id,
          url: currentTrack!.url,
          title: currentTrack!.title,
          artist: currentTrack!.artist || 'Unknown Artist',
          artwork: currentTrack!.artwork,
        });
      }

      await TrackPlayer.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading track:', error);
      setIsLoading(false);
    }
  }, [currentTrack, setIsPlaying, setIsLoading]);

  // Load and play track when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      loadTrack();
    }
  }, [currentTrack, loadTrack]);

  // Sync isPlaying state from store to TrackPlayer
  useEffect(() => {
    const syncPlaybackState = async () => {
      const state = await TrackPlayer.getState();
      const isCurrentlyPlaying = state === State.Playing;
      const isBuffering = state === State.Buffering;

      if (isPlaying && !isCurrentlyPlaying && !isBuffering) {
        // Store says play, but player is paused - start playing
        setIsLoading(true);
        await TrackPlayer.play();
        // Don't clear loading here - let the PlaybackState event handle it
      } else if (!isPlaying && isCurrentlyPlaying) {
        // Store says pause, but player is playing - pause it
        await TrackPlayer.pause();
      }
    };

    if (currentTrack) {
      syncPlaybackState();
    }
  }, [isPlaying, currentTrack, setIsLoading]);

  // Update store when playback state changes
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (event.type === Event.PlaybackState) {
      const state = await TrackPlayer.getState();
      const isActuallyPlaying = state === State.Playing;
      const isBuffering = state === State.Buffering;

      setIsPlaying(isActuallyPlaying);

      // Clear loading state when playing or stopped, set it when buffering
      if (isActuallyPlaying || state === State.Paused || state === State.Stopped) {
        setIsLoading(false);
      } else if (isBuffering) {
        setIsLoading(true);
      }
    }
  });

  const handlePlayPause = async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleLivePlayStop = () => {
    // For live mode - toggle between play and stop
    if (isPlaying) {
      stopTrack();
    } else {
      setIsPlaying(true);
    }
  };

  const handleClose = async () => {
    slideDown(async () => {
      await TrackPlayer.reset();
      clearTrack();
    });
  };

  const handleSeekComplete = async (value: number) => {
    await TrackPlayer.seekTo(value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeElapsed = () => {
    return formatTime(position);
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
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.content}>
          {/* Left side - Show image (only if artwork exists) */}
          {currentTrack?.artwork && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentTrack.artwork }}
                placeholder={{ blurhash: defaultBlurhash }}
                transition={200}
                style={styles.artwork}
                contentFit="cover"
              />
            </View>
          )}

          {/* Middle - Track info and controls */}
          <View style={styles.middleContainer}>
            {/* Controls row - full width scrubber for archive, controls for live */}
            {!isLiveMode ? (
              <View style={styles.controlsWrapper}>
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
                  {/* Progress fill - just the background color bar */}
                  <View
                    style={[
                      styles.scrubberFill,
                      {
                        backgroundColor: textColor,
                        width: `${((position / (duration || 1)) * 100)}%`,
                      },
                    ]}
                  />

                  {/* UI Elements layer - fixed positions with both normal and inverted versions */}
                  <View style={styles.scrubberContentLayer} pointerEvents="box-none">
                    {/* Play button - normal color version */}
                    <Pressable
                      onPress={handlePlayPause}
                      disabled={isLoading}
                      style={styles.scrubberPlayButton}
                    >
                      {isLoading ? (
                        <Icon name="loading" size={20} color={textColor} />
                      ) : (
                        <Icon
                          name={isPlaying ? 'pause' : 'play'}
                          size={30}
                          color={textColor}
                        />
                      )}
                    </Pressable>

                    {/* Time text - normal color version */}
                    <View style={styles.scrubberTimeContainer} pointerEvents="none">
                      <ThemedText
                        type="player"
                        style={[styles.scrubberTime, { color: textColor }]}
                      >
                        {getTimeElapsed()}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Inverted UI Elements layer - clipped overlay */}
                  <View
                    style={[
                      styles.scrubberInvertedLayer,
                      {
                        width: `${((position / (duration || 1)) * 100)}%`,
                      },
                    ]}
                    pointerEvents="box-none"
                  >
                    {/* Full-width container inside clipped area to maintain proper positioning */}
                    <View style={[styles.scrubberInvertedContent, { width: progressBarWidth }]}>
                      {/* Play button - inverted color version - absolute left position */}
                      <View style={styles.scrubberPlayButtonInverted}>
                        <Pressable
                          onPress={handlePlayPause}
                          disabled={isLoading}
                          style={styles.scrubberPlayButton}
                        >
                          {isLoading ? (
                            <Icon name="loading" size={20} color={backgroundColor} />
                          ) : (
                            <Icon
                              name={isPlaying ? 'pause' : 'play'}
                              size={30}
                              color={backgroundColor}
                            />
                          )}
                        </Pressable>
                      </View>

                      {/* Time text - inverted color version - absolute right position */}
                      <View style={styles.scrubberTimeContainerInverted} pointerEvents="none">
                        <ThemedText
                          type="player"
                          style={[styles.scrubberTime, { color: backgroundColor }]}
                        >
                          {getTimeElapsed()}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </Pressable>

                {/* Buttons outside slider */}
                <View style={styles.externalButtonsContainer}>
                  {/* Queue button */}
                  <Pressable onPress={() => queueSheetRef.current?.present()} style={styles.externalButton}>
                    <Ionicons name="list" size={18} color={textColor} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.controlsRow}>
                <Pressable
                  onPress={handleLivePlayStop}
                  disabled={isLoading}
                  style={styles.playButton}
                >
                  {isLoading ? (
                    <Icon name="loading" size={24} color={textColor} />
                  ) : (
                    <Icon
                      name={isPlaying ? 'stop' : 'play'}
                      size={24}
                      color={textColor}
                    />
                  )}
                </Pressable>

                {/* Show title for live streams */}
                <View style={styles.liveTitleContainer}>
                  <ThemedText
                    numberOfLines={1}
                  >
                    {currentTrack?.title}
                  </ThemedText>
                </View>
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
    position: 'absolute',
    bottom: 120, // Above the menu
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 100,
    borderTopWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 0,
    height: 40,
  },
  imageContainer: {
    width: 71, // 16:9 aspect ratio with height of 40
    height: 40,
    overflow: 'hidden',
    marginRight: 0,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  middleContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },
  leftContainer: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 0,
  },
  leftContainerFullWidth: {
    marginRight: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleContainer: {
    height: 27,
    justifyContent: 'center',
    marginBottom: 1,
  },
  title: {
    paddingHorizontal: 4,
  },
  controlsWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
    height: 40,
  },
  scrubberRow: {
    position: 'relative',
    height: 40,
    overflow: 'hidden',
    flex: 1,
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
  scrubberQueueButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
    position: 'relative',
  },
  scrubberCloseButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 3,
  },
  queueBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  queueBadgeText: {
    fontSize: 9,
    fontWeight: '700',
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
  scrubberButtonsContainer: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrubberButtonsContainerInverted: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrubberButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  scrubberTime: {
    textAlign: 'right',
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  artist: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: -2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginLeft: 4,
  },
  slider: {
    flex: 1,
    height: 20,
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: 12,
    minWidth: 40,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 24,
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
  },
  timeTextContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  timeTextOverlay: {
    fontSize: 12,
    fontWeight: '500',
    zIndex: 1,
  },
  timeTextInverted: {
    position: 'absolute',
    right: 0,
  },
  playButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveIndicatorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveIndicatorText: {
  },
  externalButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  externalButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  liveTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 4,
  },
});
