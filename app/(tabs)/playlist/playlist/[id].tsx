import { ShowCard } from '@/components/ShowCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getFavoritesWithShows } from '@/lib/favorites';
import { Show } from '@/types/shows';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (user && id) {
      loadPlaylist();
    }
  }, [user, id]);

  const loadPlaylist = async () => {
    setLoading(true);
    setError(null);

    try {
      if (id === 'favorites') {
        // Load favorites playlist using the new backend API
        const enrichedShows = await getFavoritesWithShows();
        setShows(enrichedShows);
      }
      // Add more playlist types here in the future
    } catch (err) {
      console.error('Error loading playlist:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlist';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
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

  const handleShowPress = (slug: string) => {
    router.push(`/(tabs)/playlist/${slug}`);
  };

  const getPlaylistTitle = () => {
    if (id === 'favorites') return 'Favorites';
    return 'Playlist';
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaylist();
    setRefreshing(false);
  }, [loadPlaylist]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            Error
          </ThemedText>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (shows.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            No shows yet
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {id === 'favorites'
              ? 'Browse shows and tap the heart icon to save them here'
              : 'This playlist is empty'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const renderShowItem = ({ item }: { item: Show }) => {
    return (
      <ShowCard
        imageUrl={getImageUrl(item.coverImage || item.artwork)}
        title={item.title}
        date={formatDate(item.date)}
        genres={item.genres}
        audioUrl={item.mixcloudLink}
        onPress={() => handleShowPress(item.slug)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { backgroundColor, borderBottomColor: textColor }]}>
        <View style={styles.headerContent}>
          <ThemedText type="title">
            {getPlaylistTitle()}
          </ThemedText>
        </View>
      </View>
      <FlatList
        data={shows}
        renderItem={renderShowItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
            colors={[textColor]}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  headerContent: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
});
