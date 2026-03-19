import { useThemeColor } from "@/hooks/useThemeColor";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import TrackPlayer, { useProgress } from "react-native-track-player";
import { Icon } from "./Icon";
import { ThemedText } from "./ThemedText";

interface DraggableScrubberProps {
  onPlayPause: () => void;
  isPlaying: boolean;
  isLoading: boolean;
}

export function DraggableScrubber({
  onPlayPause,
  isPlaying,
  isLoading,
}: DraggableScrubberProps) {
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const { position, duration } = useProgress();
  const [progressBarWidth, setProgressBarWidth] = useState(300);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [lastSeekPosition, setLastSeekPosition] = useState<number | null>(null);

  // Show loading immediately - no delay to avoid play button flash when changing tracks
  const showLoading = isLoading;

  // Helper functions to call from worklet
  const startSeeking = useCallback((touchX: number) => {
    setIsSeeking(true);
    const newPosition = (touchX / progressBarWidth) * (duration || 1);
    setSeekPosition(Math.max(0, Math.min(newPosition, duration || 1)));
  }, [progressBarWidth, duration]);

  const updateSeeking = useCallback((touchX: number) => {
    const newPosition = (touchX / progressBarWidth) * (duration || 1);
    setSeekPosition(Math.max(0, Math.min(newPosition, duration || 1)));
  }, [progressBarWidth, duration]);

  const finishSeeking = useCallback(async () => {
    const finalPosition = seekPosition;
    setIsSeeking(false);

    // Only seek if we have a valid duration and the position has actually changed
    if (
      !duration ||
      duration === 0 ||
      Math.abs(finalPosition - position) < 0.5
    ) {
      setLastSeekPosition(null);
      return;
    }

    // Keep the seek position visible until the actual position catches up
    setLastSeekPosition(finalPosition);

    // Perform the actual seek operation in the background
    try {
      await TrackPlayer.seekTo(finalPosition);
    } catch (error) {
      console.error("Error seeking:", error);
      setLastSeekPosition(null);
    }
  }, [seekPosition, duration, position]);

  // Direct seek for taps — bypasses state batching issue that causes double-tap
  const handleTap = useCallback(async (touchX: number) => {
    if (!duration || duration === 0) return;
    const newPosition = Math.max(0, Math.min((touchX / progressBarWidth) * duration, duration));
    setLastSeekPosition(newPosition);
    try {
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error("Error seeking:", error);
      setLastSeekPosition(null);
    }
  }, [progressBarWidth, duration]);

  const PLAY_BUTTON_WIDTH = 50;

  // Gesture handler - activates on horizontal movement, fails on vertical
  // This allows the bottom sheet to capture vertical gestures
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart((event) => {
      if (event.x < PLAY_BUTTON_WIDTH) return;
      runOnJS(startSeeking)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(updateSeeking)(event.x);
    })
    .onEnd(() => {
      runOnJS(finishSeeking)();
    });

  // Tap gesture - uses direct seek to avoid double-tap issue from state batching
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      if (event.x < PLAY_BUTTON_WIDTH) return;
      runOnJS(handleTap)(event.x);
    });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeElapsed = useCallback(() => {
    // Show seek position while dragging, or last seek position until actual position catches up
    if (isSeeking) {
      return formatTime(seekPosition);
    }
    if (lastSeekPosition !== null) {
      return formatTime(lastSeekPosition);
    }
    return formatTime(position);
  }, [isSeeking, seekPosition, lastSeekPosition, position]);

  // Clear lastSeekPosition once the actual position catches up
  useEffect(() => {
    if (
      lastSeekPosition !== null &&
      Math.abs(position - lastSeekPosition) < 1
    ) {
      setLastSeekPosition(null);
    }
  }, [position, lastSeekPosition]);

  const currentPosition = isSeeking
    ? seekPosition
    : lastSeekPosition !== null
      ? lastSeekPosition
      : position;
  const progressPercentage = (currentPosition / (duration || 1)) * 100;

  return (
    <View
      style={styles.scrubberContainer}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setProgressBarWidth(width);
      }}
    >
      {/* Background filled area */}
      <View
        style={[
          styles.scrubberFillBg,
          {
            backgroundColor: textColor,
            width: `${progressPercentage}%`,
          },
        ]}
      />

      {/* UI overlay - play button and time (normal colors) - non-interactive */}
      <View style={styles.uiOverlay} pointerEvents="none">
        <View style={styles.playButtonOverlay}>
          {showLoading ? (
            <View style={{ marginLeft: 5 }}>
              <Icon name="loading" size={20} color={textColor} />
            </View>
          ) : (
            <Icon
              name={isPlaying ? "pause" : "play"}
              size={30}
              color={textColor}
            />
          )}
        </View>

        <View style={styles.timeOverlay}>
          <ThemedText type="player" style={{ color: textColor }}>
            {getTimeElapsed()}
          </ThemedText>
        </View>
      </View>

      {/* Inverted UI - clipped by filled area - non-interactive */}
      <View
        style={[
          styles.invertedClip,
          {
            width: `${progressPercentage}%`,
          },
        ]}
        pointerEvents="none"
      >
        <View style={[styles.invertedContent, { width: progressBarWidth }]}>
          <View style={styles.playButtonOverlay}>
            {showLoading ? (
              <View style={{ marginLeft: 5 }}>
                <Icon name="loading" size={20} color={backgroundColor} />
              </View>
            ) : (
              <Icon
                name={isPlaying ? "pause" : "play"}
                size={30}
                color={backgroundColor}
              />
            )}
          </View>

          <View style={styles.timeOverlayInverted}>
            <ThemedText type="player" style={{ color: backgroundColor }}>
              {getTimeElapsed()}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* The actual draggable area - full width, transparent, on top */}
      <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
        <Animated.View style={styles.fullWidthSlider} />
      </GestureDetector>

      {/* Play/Pause button - interactive, on top of drag layer */}
      <Pressable
        onPress={onPlayPause}
        disabled={showLoading}
        style={styles.playButtonInteractive}
      >
        <View style={{ width: 40, height: 40 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrubberContainer: {
    position: "relative",
    height: 40,
    flex: 1,
    overflow: "hidden",
  },
  scrubberFillBg: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100%",
    zIndex: 1,
  },
  fullWidthSlider: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 40,
    width: "100%",
    zIndex: 100,
    elevation: 100,
  },
  uiOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    elevation: 1,
  },
  playButtonOverlay: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  timeOverlay: {
    position: "absolute",
    right: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  invertedClip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100%",
    overflow: "hidden",
    zIndex: 2,
    elevation: 2,
  },
  invertedContent: {
    position: "relative",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  timeOverlayInverted: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonInteractive: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 101,
    elevation: 101,
    justifyContent: "center",
    alignItems: "center",
  },
});
