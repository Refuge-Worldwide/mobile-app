import { ShowCard } from '@/components/ShowCard';
import { ShowCardSeparator } from '@/components/ShowCardSeparator';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Artist } from '@/types/artists';
import { Show } from '@/types/shows';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const API_BASE_URL = 'https://refugeworldwide.com/api/artists';

interface ArtistDetailProps {
  navigationPrefix: '/(tabs)/radio' | '/(tabs)/search';
}

export function ArtistDetail({ navigationPrefix }: ArtistDetailProps) {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isBioLong, setIsBioLong] = useState(false);

  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (slug) {
      fetchArtist(slug);
    }
  }, [slug]);

  const fetchArtist = async (artistSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/${artistSlug}`;
      console.log('=== ARTIST FETCH DEBUG ===');
      console.log('Artist slug:', artistSlug);
      console.log('Fetching artist from:', url);
      const response = await fetch(url);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        console.error('Artist fetch failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch artist: ${response.status}`);
      }

      const data = await response.json();
      console.log('Artist data received (keys):', Object.keys(data));
      console.log('Artist data.name:', data.name);
      console.log('Full artist data:', JSON.stringify(data, null, 2));

      if (!data.name) {
        console.error('No name field in data. Data keys:', Object.keys(data));
        throw new Error('No artist data in response');
      }

      const transformedArtist: Artist = {
        id: data.sys?.id || data.id,
        name: data.name,
        slug: data.slug,
        photo: data.photo?.url || data.photo,
        coverImage: data.coverImage?.url || data.coverImage,
        bio: data.description,
      };

      let transformedShows: Show[] = [];
      try {
        transformedShows = (data.shows || []).map((show: any) => {
          const showData: Show = {
            id: show.id || '',
            title: show.title || '',
            date: show.date || '',
            slug: show.slug || '',
            mixcloudLink: show.mixcloudLink || undefined,
            audioFile: show.audioFile || undefined,
            coverImage: show.coverImage || undefined,
            genres: Array.isArray(show.genres) ? show.genres : [],
            artwork: show.coverImage || undefined,
            description: show.description || undefined,
          };
          return showData;
        });
      } catch (showErr) {
        console.error('Error transforming shows:', showErr);
        transformedShows = [];
      }

      console.log('Transformed artist:', transformedArtist);
      console.log('Transformed shows count:', transformedShows.length);

      setArtist(transformedArtist);
      setShows(transformedShows);
    } catch (err) {
      console.error('Error fetching artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load artist');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getImageUrl = (url?: string): string => {
    if (!url) return '';
    return url.startsWith('//') ? `https:${url}` : url;
  };

  const handleShowPress = (showSlug: string) => {
    router.push(`${navigationPrefix}/${showSlug}`);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error || !artist) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText>{error || 'Artist not found'}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const artistImage = artist.photo || artist.coverImage;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.artistHeader}>
          <ThemedText type="title">{artist.name}</ThemedText>

          {artistImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: getImageUrl(artistImage) }}
                style={styles.artistImage}
                resizeMode="cover"
              />
            </View>
          )}

          {artist.bio && (
            <View>
              {!isBioLong && (
                <ThemedText
                  onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length > 5) {
                      setIsBioLong(true);
                    }
                  }}
                  style={{ position: 'absolute', opacity: 0 }}
                >
                  {artist.bio}
                </ThemedText>
              )}
              <ThemedText
                numberOfLines={isBioExpanded ? undefined : 5}
              >
                {artist.bio}
              </ThemedText>
              {isBioLong && (
                <Pressable onPress={() => setIsBioExpanded(!isBioExpanded)}>
                  <ThemedText style={[styles.viewMoreText, { color: textColor }]}>
                    {isBioExpanded ? 'show less' : 'show more'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {shows && shows.length > 0 && (
          <View style={styles.showsSection}>
            <ThemedText type="subtitle" style={styles.showsHeader}>
              Shows
            </ThemedText>
            {shows.map((show, index) => (
              <View key={show.id}>
                <ShowCard
                  imageUrl={getImageUrl(show.coverImage || show.artwork)}
                  title={show.title}
                  date={formatDate(show.date)}
                  genres={show.genres}
                  audioUrl={show.audioFile}
                  onPress={() => handleShowPress(show.slug)}
                  showId={show.id}
                  slug={show.slug}
                />
                {index < shows.length - 1 && <ShowCardSeparator />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  artistHeader: {
    marginBottom: 24,
  },
  nameRow: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingBottom: 12,
    marginBottom: 16,
  },
  imageContainer: {
    marginBottom: 4,
  },
  artistImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  viewMoreText: {
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  showsSection: {
    marginTop: 8,
  },
  showsHeader: {
    marginBottom: 10,
  },
});
