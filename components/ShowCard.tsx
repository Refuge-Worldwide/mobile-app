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

  const displayGenres = genres.slice(0, 3);

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Helper function to convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Create a lighter shade of the text color
  const getLighterColor = (color: string, amount: number = 0.7) => {
    const rgb = hexToRgb(color);
    if (!rgb) return color;

    // Mix with white for lighter shade
    const r = rgb.r + (255 - rgb.r) * amount;
    const g = rgb.g + (255 - rgb.g) * amount;
    const b = rgb.b + (255 - rgb.b) * amount;

    return rgbToHex(r, g, b);
  };

  // Generate blurhash-like placeholder color based on theme
  const placeholderColor = getLighterColor(textColor, 0.85);

  // Use a neutral blurhash for all themes
  const defaultBlurhash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

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
          <View style={[styles.image, { backgroundColor: placeholderColor }]} />
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
