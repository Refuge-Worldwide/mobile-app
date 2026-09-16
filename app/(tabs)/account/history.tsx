import { ShowCard } from "@/components/ShowCard";
import { ShowCardSeparator } from "@/components/ShowCardSeparator";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getHistory, ListenHistoryEntry } from "@/lib/listenHistory";
import { pushShowDetail } from "@/lib/navigation";
import { useAudioStore } from "@/store/audioStore";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

const PAGE_SIZE = 20;

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function ListenHistoryScreen() {
  const [history, setHistory] = useState<ListenHistoryEntry[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const bottomPadding = useBottomSafePadding();
  const setTrack = useAudioStore((state) => state.setTrack);

  const loadFirstPage = useCallback(async () => {
    const page = await getHistory(PAGE_SIZE, 0);
    setHistory(page);
    offsetRef.current = page.length;
    setHasMore(page.length === PAGE_SIZE);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const page = await getHistory(PAGE_SIZE, offsetRef.current);
    setHistory((prev) => [...(prev ?? []), ...page]);
    offsetRef.current += page.length;
    setHasMore(page.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const handleShowPress = (entry: ListenHistoryEntry) => {
    pushShowDetail(router, "/(tabs)/account", entry);
  };

  const handleShowPlay = (entry: ListenHistoryEntry) => {
    const audioUrl = entry.mixcloudLink?.includes("soundcloud.com")
      ? entry.mixcloudLink
      : undefined;
    if (!audioUrl) return;

    setTrack({
      id: entry.title,
      url: audioUrl,
      title: entry.title,
      artwork: entry.coverImage || entry.artwork,
      mode: "archive",
      isLive: false,
      showId: entry.id,
      slug: entry.slug,
      startPosition: entry.finished ? undefined : entry.position,
    });
  };

  const renderItem = ({ item }: { item: ListenHistoryEntry }) => (
    <ShowCard
      imageUrl={item.coverImage || item.artwork}
      title={item.title}
      date={formatDate(item.date)}
      genres={item.genres}
      mixcloudLink={item.mixcloudLink}
      onPress={() => handleShowPress(item)}
      onPlayPress={() => handleShowPlay(item)}
      showId={item.id}
      slug={item.slug}
    />
  );

  if (history === null) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyContainer, { paddingBottom: bottomPadding }]}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (history.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            No listens yet
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Shows you play from the archive will show up here.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor, borderBottomColor: textColor },
        ]}
      >
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>
            Listen History
          </ThemedText>
        </View>
      </View>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={ShowCardSeparator}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="large" />
            </View>
          ) : null
        }
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
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
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
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
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
});
