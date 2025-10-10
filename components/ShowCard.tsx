import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { ThemedText } from './ThemedText';

interface ShowCardProps {
  imageUrl?: string;
  title: string;
  date: string;
  genres: string[];
  isFavorited?: boolean;
  onFavoritePress?: () => void;
  onPress?: () => void;
}

export function ShowCard({
  imageUrl,
  title,
  date,
  genres,
  isFavorited = false,
  onFavoritePress,
  onPress,
}: ShowCardProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const displayGenres = genres.slice(0, 3);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]} />
        )}

        {onFavoritePress && (
          <Pressable
            style={styles.heartButton}
            onPress={onFavoritePress}
          >
            <Icon
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color="#fff"
            />
          </Pressable>
        )}
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
  container: {
    marginBottom: 16,
  },
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
  heartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
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
