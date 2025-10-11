import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import TrackPlayer, { Track } from 'react-native-track-player';
import { ThemedText } from './ThemedText';

interface QueuePreviewProps {
  isVisible: boolean;
  onClose: () => void;
}

export function QueuePreview({ isVisible, onClose }: QueuePreviewProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [queue, setQueue] = useState<Track[]>([]);

  const slideAnim = useRef(new Animated.Value(300)).current;

  // Fetch queue when visible
  useEffect(() => {
    if (isVisible) {
      loadQueue();
    }
  }, [isVisible]);

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

  const slideUp = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const slideDown = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [slideAnim, onClose]);

  // Trigger animation when visibility changes
  if (isVisible) {
    slideUp();
  }

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

  if (!isVisible && slideAnim._value === 300) return null;

  return (
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
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Queue ({queue.length})
        </ThemedText>
        <Pressable onPress={slideDown} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={textColor} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {queue.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No tracks in queue</ThemedText>
          </View>
        ) : (
          queue.map((track, index) => (
            <View key={`${track.id}-${index}`} style={[styles.queueItem, { borderBottomColor: textColor }]}>
              {track.artwork && (
                <Image
                  source={{ uri: track.artwork }}
                  style={styles.artwork}
                  contentFit="cover"
                />
              )}
              <View style={styles.trackInfo}>
                <ThemedText numberOfLines={1} style={styles.trackTitle}>
                  {track.title}
                </ThemedText>
                <ThemedText numberOfLines={1} style={styles.trackArtist}>
                  {track.artist || 'Unknown Artist'}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleRemove(index)}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color={textColor} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    borderTopWidth: 1,
    zIndex: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
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
