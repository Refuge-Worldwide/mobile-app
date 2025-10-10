import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  View,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ShowCard } from '@/components/ShowCard';
import { Show } from '@/types/shows';

const API_BASE_URL = 'https://refugeworldwide.com/api/shows';
const ITEMS_PER_PAGE = 20;

export default function Archive() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fetchShows = useCallback(async (currentSkip: number) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}?take=${ITEMS_PER_PAGE}&skip=${currentSkip}&filter=`
      );
      const data: Show[] = await response.json();

      if (data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setShows((prev) => [...prev, ...data]);
      setSkip(currentSkip + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchShows(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchShows(skip);
    }
  };

  const toggleFavorite = (showId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(showId)) {
        newFavorites.delete(showId);
      } else {
        newFavorites.add(showId);
      }
      return newFavorites;
    });
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

  const renderShowItem = ({ item }: { item: Show }) => {
    const imageUrl = getImageUrl(item.coverImage || item.artwork);
    const isFavorited = favorites.has(item.id);

    return (
      <ShowCard
        imageUrl={imageUrl}
        title={item.title}
        date={formatDate(item.date)}
        genres={item.genres}
        isFavorited={isFavorited}
        onFavoritePress={() => toggleFavorite(item.id)}
        onPress={() => {
          // TODO: Navigate to show detail page
          console.log('Show pressed:', item.slug);
        }}
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
      <FlatList
        data={shows}
        renderItem={renderShowItem}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
