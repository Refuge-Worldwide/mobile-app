import { Icon } from '@/components/Icon';
import { ShowCard } from '@/components/ShowCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { isFavorited, toggleFavorite } from '@/lib/favorites';
import { Show } from '@/types/shows';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';

const API_BASE_URL = 'https://refugeworldwide.com/api/shows';

interface ShowDetailProps {
  navigationPrefix: '/(tabs)/radio' | '/(tabs)/search';
}

export function ShowDetail({ navigationPrefix }: ShowDetailProps) {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionLong, setIsDescriptionLong] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (slug) {
      fetchShow(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (user && show) {
      checkFavoriteStatus();
    }
  }, [user, show?.id]);

  const fetchShow = async (showSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${showSlug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch show');
      }
      const data = await response.json();

      // Transform the API response to match our Show type
      const transformedShow: Show = {
        id: data.show.sys?.id || data.show.id,
        title: data.show.title,
        date: data.show.date,
        slug: data.show.slug,
        mixcloudLink: data.show.mixcloudLink,
        audioFile: data.show.audioFile?.url || data.show.audioFile,
        coverImage: data.show.coverImage?.url || data.show.coverImage,
        genres: data.show.genresCollection?.items?.map((g: any) => g.name) || [],
        artwork: data.show.coverImage?.url,
        description: data.show.description,
        relatedShows: data.relatedShows || [],
      };

      setShow(transformedShow);
    } catch (err) {
      console.error('Error fetching show:', err);
      setError('Failed to load show');
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

  const handleRelatedShowPress = (relatedSlug: string) => {
    router.push(`${navigationPrefix}/${relatedSlug}`);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://refugeworldwide.com/shows/${slug}`;
      const shareMessage = `${show?.title} - ${formatDate(show?.date || '')}`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!show?.id) return;
    const favorited = await isFavorited(show.id);
    setIsFavorite(favorited);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to favorite shows');
      return;
    }

    if (!show?.id) return;

    setFavoriteLoading(true);
    const { error } = await toggleFavorite(show.id);
    setFavoriteLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to update favorite');
    } else {
      setIsFavorite(!isFavorite);
    }
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

  if (error || !show) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText>{error || 'Show not found'}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const imageUrl = getImageUrl(show.coverImage || show.artwork);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Show Card */}
        <View style={styles.showCardWrapper}>
          <ShowCard
            imageUrl={imageUrl}
            title={show.title}
            date={formatDate(show.date)}
            genres={show.genres}
            audioUrl={show.audioFile}
            showId={show.id}
          />

          {/* Description */}
          {show.description && (
            <View style={styles.descriptionContainer}>
              <ThemedText
                numberOfLines={isDescriptionExpanded ? undefined : 5}
                onTextLayout={(e) => {
                  if (e.nativeEvent.lines.length > 5) {
                    setIsDescriptionLong(true);
                  }
                }}
              >
                {show.description}
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
            <Pressable onPress={handleToggleFavorite} style={styles.actionButton}>
              {favoriteLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Icon
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? textColor : undefined}
                />
              )}
            </Pressable>
            <Pressable onPress={handleShare} style={styles.actionButton}>
              <Icon name="share" size={24} />
            </Pressable>
          </View>
        </View>

        {/* Related Shows */}
        {show.relatedShows && show.relatedShows.length > 0 && (
          <View style={styles.relatedShowsSection}>
            <ThemedText type='subtitle' style={{ marginBottom: 10 }}>
              Related Shows
            </ThemedText>
            <View>
              {show.relatedShows.map((relatedShow) => (
                <View key={relatedShow.id}>
                  <ShowCard
                    imageUrl={getImageUrl(relatedShow.coverImage || relatedShow.artwork)}
                    title={relatedShow.title}
                    date={formatDate(relatedShow.date)}
                    genres={relatedShow.genres}
                    audioUrl={relatedShow.audioFile}
                    onPress={() => handleRelatedShowPress(relatedShow.slug)}
                    showId={relatedShow.id}
                  />
                </View>
              ))}
            </View>
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
  showCardWrapper: {
    marginBottom: 42,
  },
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
  relatedShowsSection: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  actionButton: {
    padding: 8,
  },
});
