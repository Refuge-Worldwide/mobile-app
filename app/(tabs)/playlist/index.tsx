import { ShowCard } from '@/components/ShowCard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { getFavorites } from '@/lib/favorites';
import { fetchShowsByIds } from '@/lib/showsApi';
import { Show } from '@/types/shows';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

interface FavoriteShow {
  favoriteId: string;
  showData: Show | null;
}

export default function PlaylistScreen() {
  const { user } = useAuth();
  const [favoriteShows, setFavoriteShows] = useState<FavoriteShow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) {
      setFavoriteShows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get favorite show IDs from database
    const favorites = await getFavorites();
    const showIds = favorites.map((f) => f.show_id);

    // Fetch fresh show data from API
    const showsMap = await fetchShowsByIds(showIds);

    // Combine favorites with their show data
    const favoritesWithShows: FavoriteShow[] = favorites.map((favorite) => ({
      favoriteId: favorite.id,
      showData: showsMap.get(favorite.show_id) || null,
    }));

    setFavoriteShows(favoritesWithShows);
    setLoading(false);
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
    router.push(`/(tabs)/radio/${slug}`);
  };

  const handleSignInPress = () => {
    router.push('/(tabs)/account');
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

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            Sign in to save favorites
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Create an account to save your favorite shows
          </ThemedText>
          <ThemedButton
            title="Go to Account"
            onPress={handleSignInPress}
          />
        </View>
      </ThemedView>
    );
  }

  if (favoriteShows.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            No favorites yet
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Browse shows and tap the heart icon to save them here
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Your Favorites
        </ThemedText>
        <View style={styles.showsList}>
          {favoriteShows.map((favorite) => {
            const show = favorite.showData;
            if (!show) return null; // Skip if show data couldn't be fetched

            return (
              <View key={favorite.favoriteId}>
                <ShowCard
                  imageUrl={getImageUrl(show.coverImage || show.artwork)}
                  title={show.title}
                  date={formatDate(show.date)}
                  genres={show.genres}
                  audioUrl={show.mixcloudLink}
                  onPress={() => handleShowPress(show.slug)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingTop: 60,
    paddingBottom: 24,
  },
  title: {
    marginBottom: 20,
  },
  showsList: {
    gap: 8,
  },
});
