import { BottomSheet } from "@/components/BottomSheet";
import { GenreFilter } from "@/components/GenreFilter";
import { ShowCard } from "@/components/ShowCard";
import { ShowCardSeparator } from "@/components/ShowCardSeparator";
import { ShowCardSkeleton } from "@/components/SkeletonLoader";
import { SupporterBanner } from "@/components/SupporterBanner";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { pushShowDetail } from "@/lib/navigation";
import { Show } from "@/types/shows";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

const API_BASE_URL = "https://refugeworldwide.com/api/shows";
const FEATURED_API_URL = "https://refugeworldwide.com/api/shows/featured";
const GENRES_API_URL = "https://refugeworldwide.com/api/genres";
const ITEMS_PER_PAGE = 20;

type TabType = "featured" | "latest" | "genre";

// The archive list is normally just shows, but signed-out users get a
// "become a supporter" banner spliced in after the first two — see
// buildListEntries below.
type ListEntry = { type: "show"; show: Show } | { type: "banner" };

function buildListEntries(shows: Show[], showBanner: boolean): ListEntry[] {
  const entries: ListEntry[] = shows.map((show) => ({ type: "show", show }));
  if (showBanner) {
    entries.splice(Math.min(2, entries.length), 0, { type: "banner" });
  }
  return entries;
}

export default function Archive() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("latest");
  const [genres, setGenres] = useState<string[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresError, setGenresError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  // Synchronous guard against overlapping fetches — `loading` state updates
  // aren't synchronous, so two onEndReached calls fired back-to-back (a
  // known FlatList quirk) can both read loading===false before either
  // setLoading(true) commits, both fetch the same page, and both append —
  // duplicating every show.id on that page (React's "two children with the
  // same key" warning).
  const isFetchingShowsRef = useRef(false);
  // Bumped every time the list is reset (tab switch, genre change). A
  // pagination fetch started under the old tab/filter can still resolve
  // after the switch — this lets it recognize that and discard its result
  // instead of appending stale data onto the new list.
  const listGenerationRef = useRef(0);
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const bottomPadding = useBottomSafePadding();

  const fetchShows = useCallback(
    async (currentSkip: number, genres: string[] = []) => {
      if (isFetchingShowsRef.current) return;
      isFetchingShowsRef.current = true;
      const requestGeneration = listGenerationRef.current;

      setLoading(true);
      try {
        const genreFilter = genres.length > 0 ? genres.join(",") : "";
        const response = await fetch(
          `${API_BASE_URL}?take=${ITEMS_PER_PAGE}&skip=${currentSkip}&filter=${genreFilter}`,
        );
        const data: Show[] = await response.json();

        // The tab/genre filter changed while this was in flight — this
        // page no longer belongs to the list currently on screen.
        if (requestGeneration !== listGenerationRef.current) return;

        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }

        if (currentSkip === 0) {
          setShows(data);
        } else {
          setShows((prev) => {
            // Ensure prev is always an array
            if (!Array.isArray(prev)) {
              return data;
            }
            // Defensive dedupe — belt-and-braces against any other source
            // of overlap (e.g. the underlying list shifting between pages).
            const existingIds = new Set(prev.map((show) => show.id));
            return [...prev, ...data.filter((show) => !existingIds.has(show.id))];
          });
        }
        setSkip(currentSkip + ITEMS_PER_PAGE);
      } catch (error) {
        console.error("Error fetching shows:", error);
      } finally {
        isFetchingShowsRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  const fetchFeaturedShows = useCallback(async () => {
    if (isFetchingShowsRef.current) return;
    isFetchingShowsRef.current = true;
    const requestGeneration = listGenerationRef.current;

    setLoading(true);
    try {
      const response = await fetch(FEATURED_API_URL);
      const data: Show[] = await response.json();

      // The tab changed while this was in flight — discard.
      if (requestGeneration !== listGenerationRef.current) return;

      setShows(data);
      setHasMore(false); // Featured shows don't have pagination
    } catch (error) {
      console.error("Error fetching featured shows:", error);
    } finally {
      isFetchingShowsRef.current = false;
      setLoading(false);
    }
  }, []);

  const fetchGenres = useCallback(async () => {
    setGenresLoading(true);
    setGenresError(null);
    try {
      const response = await fetch(GENRES_API_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch genres");
      }
      const data = await response.json();
      // Assuming the API returns an array of strings or objects with name property
      const genreNames = Array.isArray(data)
        ? data.map((genre) =>
          typeof genre === "string"
            ? genre
            : genre.name || genre.title || genre,
        )
        : [];
      setGenres(genreNames);
    } catch (err) {
      console.error("Error fetching genres:", err);
      setGenresError("Failed to load genres");
      // Fallback to hardcoded genres on error
      setGenres(["Bass", "Bleep", "Blues", "Ambient", "Afrohouse", "Afrobeat"]);
    } finally {
      setGenresLoading(false);
    }
  }, []);

  useEffect(() => {
    listGenerationRef.current += 1;
    setShows([]);
    setSkip(0);
    setHasMore(true);

    if (activeTab === "featured") {
      fetchFeaturedShows();
    } else {
      fetchShows(0, selectedGenres);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenres, activeTab]);

  // Load genres when component mounts
  useEffect(() => {
    fetchGenres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    if (!loading && hasMore && activeTab !== "featured") {
      fetchShows(skip, selectedGenres);
    }
  };

  const handleRefresh = useCallback(async () => {
    listGenerationRef.current += 1;
    setRefreshing(true);
    setSkip(0);
    setHasMore(true);

    try {
      if (activeTab === "featured") {
        await fetchFeaturedShows();
      } else {
        await fetchShows(0, selectedGenres);
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, selectedGenres, fetchFeaturedShows, fetchShows]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      return [...prev, genre];
    });
  };

  const handleClearGenres = () => {
    setSelectedGenres([]);
  };

  const closeGenreFilter = () => {
    bottomSheetRef.current?.dismiss();
  };

  const openGenreFilter = () => {
    bottomSheetRef.current?.present();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const renderListEntry = ({ item }: { item: ListEntry }) => {
    if (item.type === "banner") {
      return <SupporterBanner overlay="pill" />;
    }

    const show = item.show;
    return (
      <ShowCard
        imageUrl={show.coverImage || show.artwork}
        mixcloudLink={show.mixcloudLink}
        title={show.title}
        date={formatDate(show.date)}
        genres={show.genres}
        onPress={() => pushShowDetail(router, "/(tabs)/radio", show)}
        showId={show.id}
        slug={show.slug}
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
      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: textColor }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "latest" && styles.tabActive,
            {
              borderColor: textColor,
              backgroundColor:
                activeTab === "latest" ? textColor : "transparent",
            },
          ]}
          onPress={() => setActiveTab("latest")}
        >
          <ThemedText
            type="tag"
            style={[
              activeTab === "latest" && styles.tabTextActive,
              { color: activeTab === "latest" ? backgroundColor : textColor },
            ]}
          >
            Latest
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === "featured" && styles.tabActive,
            {
              borderColor: textColor,
              backgroundColor:
                activeTab === "featured" ? textColor : "transparent",
            },
          ]}
          onPress={() => setActiveTab("featured")}
        >
          <ThemedText
            type="tag"
            style={[
              activeTab === "featured" && styles.tabTextActive,
              { color: activeTab === "featured" ? backgroundColor : textColor },
            ]}
          >
            Featured
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            { borderColor: textColor, backgroundColor: "transparent" },
          ]}
          onPress={() => {
            openGenreFilter();
          }}
        >
          <ThemedText type="tag" style={[{ color: textColor }]}>
            Genre
          </ThemedText>
        </Pressable>
      </View>

      {/* Selected Genres Header */}
      {selectedGenres.length > 0 && (
        <View style={[styles.genreHeader, { borderBottomColor: textColor }]}>
          <ThemedText style={styles.genreHeaderText}>
            Filtered by: {selectedGenres.join(", ")}
          </ThemedText>
          <Pressable onPress={handleClearGenres}>
            <Ionicons name="close-circle" size={20} color={textColor} />
          </Pressable>
        </View>
      )}

      {/* Loading skeleton for initial load */}
      {shows.length === 0 && loading ? (
        <View style={[styles.listContent, { paddingBottom: bottomPadding }]}>
          <ShowCardSkeleton />
          <ShowCardSeparator />
          <ShowCardSkeleton />
          {!user && (
            <>
              <ShowCardSeparator />
              <SupporterBanner overlay="pill" />
            </>
          )}
          <ShowCardSeparator />
          <ShowCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={buildListEntries(shows, !user)}
          renderItem={renderListEntry}
          keyExtractor={(item) =>
            item.type === "banner" ? "supporter-banner" : item.show.id
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={ShowCardSeparator}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
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

      {/* Genre Filter Bottom Sheet */}
      <BottomSheet ref={bottomSheetRef} snapPoints={["70%", "90%"]}>
        <GenreFilter
          selectedGenres={selectedGenres}
          onGenreToggle={handleGenreToggle}
          onClearAll={handleClearGenres}
          onClose={closeGenreFilter}
          genres={genres}
          genresLoading={genresLoading}
          genresError={genresError}
          onRetryLoadGenres={fetchGenres}
        />
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    // Active styling handled by backgroundColor prop
  },
  tabTextActive: {
    // Active text color handled by color prop
  },
  genreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  genreHeaderText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
