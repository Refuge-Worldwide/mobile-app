import { useThemeColor } from '@/hooks/useThemeColor';
import { Show } from '@/types/shows';
import { useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { ShowCard } from './ShowCard';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const API_BASE_URL = 'https://refugeworldwide.com/api/shows';
const ITEMS_PER_PAGE = 20;

interface GenreShowsListProps {
  genre: string;
}

export function GenreShowsList({ genre }: GenreShowsListProps) {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();
  const segments = useSegments();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  // Determine which tab we're in for navigation
  const currentTab = segments[1] as string;

  const fetchShows = useCallback(async (currentSkip: number) => {
    if (loading || !genre) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}?take=${ITEMS_PER_PAGE}&skip=${currentSkip}&filter=${encodeURIComponent(genre)}`
      );
      const data: Show[] = await response.json();

      if (data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      if (currentSkip === 0) {
        setShows(data);
      } else {
        setShows((prev) => {
          if (!Array.isArray(prev)) {
            return data;
          }
          return [...prev, ...data];
        });
      }
      setSkip(currentSkip + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, genre]);

  useEffect(() => {
    setShows([]);
    setSkip(0);
    setHasMore(true);
    fetchShows(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchShows(skip);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setSkip(0);
    setHasMore(true);
    await fetchShows(0);
    setRefreshing(false);
  }, [fetchShows]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const renderShowItem = ({ item }: { item: Show }) => {
    return (
      <ShowCard
        imageUrl={item.coverImage || item.artwork}
        audioUrl={item.audioFile}
        title={item.title}
        date={formatDate(item.date)}
        genres={item.genres}
        onPress={() => router.push(`/(tabs)/${currentTab}/${item.slug}` as any)}
        showId={item.id}
      />
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" />
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { backgroundColor, borderBottomColor: textColor }]}>
        <View style={styles.headerContent}>
          <ThemedText type="title">
            {genre}
          </ThemedText>
        </View>
      </View>
      {shows.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            No shows found for "{genre}"
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={shows}
          renderItem={renderShowItem}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
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
      )}
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
  titleContainer: {
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
});
