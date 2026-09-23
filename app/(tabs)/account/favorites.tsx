import { ShowCard } from "@/components/ShowCard";
import { ShowCardSeparator } from "@/components/ShowCardSeparator";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getFavouritesWithShows } from "@/lib/favourites";
import { pushShowDetail } from "@/lib/navigation";
import { useAudioStore } from "@/store/audioStore";
import { Show } from "@/types/shows";
import { ensureHttps } from "@/utils/imageOptimization";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

function mapShowToTrack(show: Show, getImageUrl: (url?: string) => string | undefined, formatDate: (d?: string) => string) {
  const audioUrl = show.mixcloudLink?.includes("soundcloud.com") ? show.mixcloudLink : undefined;
  return audioUrl ? {
    id: show.title,
    url: audioUrl,
    title: show.title,
    artist: formatDate(show.date),
    artwork: getImageUrl(show.coverImage || show.artwork),
    mode: "archive" as const,
    isLive: false,
    showId: show.id,
    slug: show.slug,
  } : null;
}

export default function FavoritesScreen() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const bottomPadding = useBottomSafePadding();

  const setTrack = useAudioStore((state) => state.setTrack);
  const addToQueue = useAudioStore((state) => state.addToQueue);
  const clearQueue = useAudioStore((state) => state.clearQueue);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);

    try {
      const enrichedShows = await getFavouritesWithShows();
      setShows(enrichedShows);
    } catch (err) {
      console.error("Error loading favorites:", err);
      setError(err instanceof Error ? err.message : "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getImageUrl = ensureHttps;

  const handleShowPlay = (show: Show, index: number) => {
    const track = mapShowToTrack(show, getImageUrl, formatDate);
    if (!track) return;
    setTrack(track);
    clearQueue();
    const next = shows.slice(index + 1, index + 31);
    next.forEach((s) => {
      const t = mapShowToTrack(s, getImageUrl, formatDate);
      if (t) addToQueue(t);
    });
  };

  const handleShowPress = (show: Show) => {
    pushShowDetail(router, "/(tabs)/account", show);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, []);

  const header = (
    <View
      style={[
        styles.headerContainer,
        { backgroundColor, borderBottomColor: textColor },
      ]}
    >
      <View style={styles.headerContent}>
        <ThemedText type="title" style={styles.headerTitle}>Favourites</ThemedText>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        {header}
        <View style={[styles.emptyContainer, { paddingBottom: bottomPadding }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        {header}
        <View style={styles.emptyContainer}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
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
        {header}
        <View style={styles.emptyContainer}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No shows yet
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Browse shows and tap the heart icon to save them here
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const renderShowItem = ({ item, index }: { item: Show; index: number }) => (
    <ShowCard
      imageUrl={getImageUrl(item.coverImage || item.artwork)}
      title={item.title}
      date={formatDate(item.date)}
      genres={item.genres}
      mixcloudLink={item.mixcloudLink}
      onPress={() => handleShowPress(item)}
      onPlayPress={() => handleShowPlay(item, index)}
      showId={item.id}
      slug={item.slug}
    />
  );

  return (
    <ThemedView style={styles.container}>
      {header}
      <FlatList
        data={shows}
        renderItem={renderShowItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={ShowCardSeparator}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});
