import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import TrackPlayer, { Track } from 'react-native-track-player';
import { ThemedText } from './ThemedText';

export interface QueuePreviewRef {
  present: () => void;
  dismiss: () => void;
}

export const QueuePreview = forwardRef<QueuePreviewRef>((props, ref) => {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [queue, setQueue] = useState<Track[]>([]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => bottomSheetRef.current?.present(),
    dismiss: () => bottomSheetRef.current?.dismiss(),
  }));

  // Fetch queue when sheet opens
  const handleSheetChange = useCallback((index: number) => {
    if (index >= 0) {
      loadQueue();
    }
  }, []);

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

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['40%', '75%']}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor }}
      handleIndicatorStyle={{ backgroundColor: textColor }}
      onChange={handleSheetChange}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Queue ({queue.length})
          </ThemedText>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 32,
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
