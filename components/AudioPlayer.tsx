import { useThemeColor } from "@/hooks/useThemeColor";
import { fetchShowBySlug } from "@/lib/showsApi";
import { useAudioStore } from "@/store/audioStore";
import {
  optimizePlayerImage,
  optimizeShowImage,
} from "@/utils/imageOptimization";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  TrackType,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { DraggableScrubber } from "./DraggableScrubber";
import { Icon } from "./Icon";
import { QueuePreview, QueuePreviewRef } from "./QueuePreview";
import { ThemedText } from "./ThemedText";

async function resolveStreamUrl(url: string): Promise<string | null> {
  if (!url.includes("soundcloud.com")) return url;
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/soundcloud-resolve?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) throw new Error(`soundcloud-resolve ${res.status}`);
    const data = await res.json();
    return data.streamUrl || null;
  } catch (error) {
    console.error("Error resolving SoundCloud stream URL:", error);
    return null;
  }
}

export function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    setIsPlaying,
    setIsLoading,
    clearTrack,
    playNextFromQueue,
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
  const lastLoadedTrackId = useRef<string | null>(null);

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

  // Setup Track Player
  useEffect(() => {
    let isSetup = false;

    const setupPlayer = async () => {
      try {
        // Check if player is already setup
        const state = await TrackPlayer.getActiveTrackIndex();
        isSetup = state !== undefined;
      } catch {
        isSetup = false;
      }

      if (isSetup) {
        console.log("Player already setup, skipping initialization");
        return;
      }

      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior:
              AppKilledPlaybackBehavior.ContinuePlayback,
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
        console.log("Error setting up player:", error);
      }
    };

    setupPlayer();
  }, [clearTrack]);

  // Load and play track when currentTrack ID or URL changes (not on metadata updates)
  useEffect(() => {
    if (!currentTrack) {
      lastLoadedTrackId.current = null;
      return;
    }

    // Only reload if the track ID has actually changed
    if (lastLoadedTrackId.current === currentTrack.id) {
      return;
    }

    const loadTrack = async () => {
      try {
        // Reset first to stop any current playback
        await TrackPlayer.reset();

        // Resolve SoundCloud URLs to direct stream URLs before loading
        const streamUrl = await resolveStreamUrl(currentTrack.url);
        if (!streamUrl) {
          setIsLoading(false);
          setIsPlaying(false);
          return;
        }

        // Update player options and add track in parallel for faster loading
        const updateOptionsPromise = currentTrack.isLive
          ? TrackPlayer.updateOptions({
            capabilities: [Capability.Play, Capability.Stop],
            compactCapabilities: [Capability.Play, Capability.Stop],
            notificationCapabilities: [Capability.Play, Capability.Stop],
          })
          : TrackPlayer.updateOptions({
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

        const addTrackPromise = TrackPlayer.add({
          id: currentTrack.id,
          url: streamUrl,
          title: currentTrack.title,
          artist: currentTrack.artist || "Unknown Artist",
          artwork: optimizePlayerImage(currentTrack.artwork),
          isLiveStream: currentTrack.isLive,
          type: streamUrl.includes(".m3u8") ? TrackType.HLS : TrackType.Default,
        });

        // Wait for both to complete
        await Promise.all([updateOptionsPromise, addTrackPromise]);

        // Play the track - isPlaying is already true from setTrack
        await TrackPlayer.play();

        // Update the ref to track this loaded track
        lastLoadedTrackId.current = currentTrack.id;
        // Loading state will be cleared by PlaybackState event
      } catch (error) {
        console.error("Error loading track:", error);
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    loadTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrack?.url]);

  // Update now playing metadata for live streams when track info changes
  useEffect(() => {
    const updateMetadata = async () => {
      if (!currentTrack?.isLive) return;

      try {
        // Check if there's a track in the player before updating metadata
        const queue = await TrackPlayer.getQueue();
        if (queue.length === 0) return;

        await TrackPlayer.updateNowPlayingMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || "Live on Refuge Worldwide",
          artwork: optimizePlayerImage(currentTrack.artwork),
        });
      } catch (error) {
        // Silently ignore errors - metadata will be set when track loads
      }
    };

    updateMetadata();
  }, [
    currentTrack?.title,
    currentTrack?.artwork,
    currentTrack?.artist,
    currentTrack?.isLive,
  ]);

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

  // Sync isPlaying state from store to TrackPlayer
  useEffect(() => {
    if (!currentTrack) return;

    const syncPlaybackState = async () => {
      try {
        const state = await TrackPlayer.getState();
        const isCurrentlyPlaying = state === State.Playing;
        const isCurrentlyPaused = state === State.Paused;
        const isReady = state === State.Ready;

        // Only sync when player is in a stable state (not buffering/loading)
        // This prevents fighting with transitional states
        if (isPlaying && (isCurrentlyPaused || isReady)) {
          // Store says play, but player is paused/ready - start playing
          await TrackPlayer.play();
        } else if (!isPlaying && isCurrentlyPlaying) {
          // Store says pause, but player is playing - pause it
          await TrackPlayer.pause();
        }
      } catch (error) {
        console.error("Error syncing playback state:", error);
      }
    };

    syncPlaybackState();
  }, [isPlaying, currentTrack]);

  // Update store when playback state changes
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackQueueEnded],
    async (event) => {
      if (event.type === Event.PlaybackState) {
        const state = await TrackPlayer.getState();
        const isActuallyPlaying = state === State.Playing;
        const isActuallyPaused = state === State.Paused;
        const isBuffering =
          state === State.Buffering || state === State.Loading;

        // Only update isPlaying for definitive states (Playing or Paused)
        // Ignore transitional states (Buffering, Loading, Ready, Connecting)
        // This prevents flickering during state transitions
        if (isActuallyPlaying && !isPlaying) {
          setIsPlaying(true);
        } else if (isActuallyPaused && isPlaying) {
          setIsPlaying(false);
        }

        // Update loading state
        if (isBuffering && !isLoading) {
          setIsLoading(true);
        } else if ((isActuallyPlaying || isActuallyPaused) && isLoading) {
          // Clear loading when we reach a stable state
          setIsLoading(false);
        }
      }

      // When current track ends, play next from queue
      if (event.type === Event.PlaybackQueueEnded) {
        const nextTrack = playNextFromQueue();
        if (nextTrack) {
          // The track will be loaded by the existing effect that watches currentTrack
          console.log("Playing next from queue:", nextTrack.title);
        }
      }
    },
  );

  const handlePlayPause = async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleLivePlayStop = () => {
    // Toggle play/pause for live streams
    setIsPlaying(!isPlaying);
  };

  const handleClose = async () => {
    slideDown(async () => {
      await TrackPlayer.reset();
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
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: optimizeShowImage(currentTrack.artwork) }}
                placeholder={{ blurhash: defaultBlurhash }}
                transition={200}
                style={styles.artwork}
                contentFit="cover"
              />
            </View>
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
