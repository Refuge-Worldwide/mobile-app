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
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function ListenHistoryScreen() {
  const [history, setHistory] = useState<ListenHistoryEntry[] | null>(null);
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const bottomPadding = useBottomSafePadding();
  const setTrack = useAudioStore((state) => state.setTrack);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, []),
  );

  const handleShowPress = (entry: ListenHistoryEntry) => {
    const cachedShow = {
      slug: entry.slug,
      title: entry.title,
      coverImage: entry.artwork,
    };
    pushShowDetail(router, "/(tabs)/account", cachedShow);
  };

  const handleShowPlay = (entry: ListenHistoryEntry) => {
    setTrack({
      id: entry.title,
      url: entry.url,
      title: entry.title,
      artwork: entry.artwork,
      mode: "archive",
      isLive: false,
      showId: entry.showId,
      slug: entry.slug,
      startPosition: entry.finished ? undefined : entry.position,
    });
  };

  const renderItem = ({ item }: { item: ListenHistoryEntry }) => (
    <ShowCard
      imageUrl={item.artwork}
      title={item.title}
      date={formatTimeAgo(item.updatedAt)}
      genres={[]}
      mixcloudLink={item.url}
      onPress={() => handleShowPress(item)}
      onPlayPress={() => handleShowPlay(item)}
      showId={item.showId}
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
        keyExtractor={(item) => item.showId}
        ItemSeparatorComponent={ShowCardSeparator}
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
