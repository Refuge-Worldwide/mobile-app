import { useThemeColor } from '@/hooks/useThemeColor';
import { useAudioStore } from '@/store/audioStore';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { Icon } from './Icon';
import { ThemedText } from './ThemedText';

interface ShowCardProps {
  imageUrl?: string;
  blurhash?: string;
  title: string;
  date: string;
  genres: string[];
  audioUrl?: string;
  onPress?: () => void;
}

export function ShowCard({
  imageUrl,
  blurhash,
  title,
  date,
  genres,
  audioUrl,
  onPress,
}: ShowCardProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useThemeColor({}, 'text') === '#11181C' ? 'light' : 'dark';

  const displayGenres = genres.slice(0, 3);

  // Theme-aware blurhash with more interesting gradient patterns
  const defaultBlurhash = colorScheme === 'dark'
    ? 'L04.Jn00~q-;xuof4nM{00D%?bRj' // Dark theme: darker with subtle variations
    : 'LLPZz~ofM{of~qayM{j[RjayRjof'; // Light theme: lighter with subtle variations

  const setTrack = useAudioStore((state) => state.setTrack);

  const handlePlayPress = (e: any) => {
    e.stopPropagation();
    if (audioUrl) {
      setTrack({
        id: title,
        url: audioUrl,
        title: title,
        artist: date,
        artwork: imageUrl,
        mode: 'archive',
        isLive: false,
      });
    }
  };

  const handleQueuePress = async (e: any) => {
    e.stopPropagation();
    if (audioUrl) {
      try {
        await TrackPlayer.add({
          id: title,
          url: audioUrl,
          title: title,
          artist: date,
          artwork: imageUrl,
        });
      } catch (error) {
        console.error('Error adding to queue:', error);
      }
    }
  };

  return (
    <Pressable onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            placeholder={{ blurhash: blurhash || defaultBlurhash }}
            transition={300}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]} />
        )}

        <View style={styles.buttonContainer}>
          {audioUrl && (
            <>
              <Pressable
                style={[styles.iconButton, { backgroundColor: textColor }]}
                onPress={handlePlayPress}
              >
                <Icon
                  name="play"
                  size={40}
                  color={backgroundColor}
                />
              </Pressable>
              <Pressable
                style={[styles.iconButton, { backgroundColor: textColor }]}
                onPress={handleQueuePress}
              >
                <Icon
                  name="plus"
                  size={40}
                  color={backgroundColor}
                />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={[styles.infoRow, { borderBottomColor: textColor }]}>
        <View style={[styles.dateBox, { backgroundColor: textColor }]}>
          <ThemedText style={{ color: backgroundColor }}>
            {date}
          </ThemedText>
        </View>
        <View style={styles.titleContainer}>
          <ThemedText>
            {title}
          </ThemedText>
        </View>
      </View>

      {displayGenres.length > 0 && (
        <View style={styles.genresContainer}>
          {displayGenres.map((genre, index) => (
            <View key={`${genre}-${index}`} style={[styles.genreTag, { borderColor: textColor }]}>
              <ThemedText type='tag'>{genre}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </Pressable >
  );
}

const styles = StyleSheet.create({
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
  placeholderImage: {
    backgroundColor: '#333',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
    marginTop: 0,
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
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  genreTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
});
