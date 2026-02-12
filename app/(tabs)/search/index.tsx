import { GenreTag } from "@/components/GenreTag";
import { ShowCard } from "@/components/ShowCard";
import { ShowCardSeparator } from "@/components/ShowCardSeparator";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface Show {
  id: string;
  title: string;
  slug: string;
  date: string;
  coverImage: string;
  mixcloudLink: string;
  genres: string[];
}

interface Genre {
  fields: {
    name: string;
    slug?: string;
  };
  sys: {
    id: string;
    type: string;
  };
}

interface SearchResponse {
  shows: Show[];
  articles: any[];
  artists: any[];
  genres?: Genre[];
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Show[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [genresLoading, setGenresLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const router = useRouter();
  const bottomPadding = useBottomSafePadding();

  // Fetch genres on mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setGenresLoading(true);
        const response = await fetch(
          'https://refugeworldwide.com/api/search?query=',
        );

        if (!response.ok) {
          throw new Error("Failed to fetch genres");
        }

        const data: SearchResponse = await response.json();
        setGenres(data.genres || []);
      } catch (err) {
        console.error("Error fetching genres:", err);
      } finally {
        setGenresLoading(false);
      }
    };

    fetchGenres();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://refugeworldwide.com/api/search?query=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data: SearchResponse = await response.json();
      setResults(data.shows || []);
      // Update genres if they come with search results
      if (data.genres) {
        setGenres(data.genres);
      }
    } catch (err) {
      console.error("Error searching:", err);
      setError("Failed to load search results");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const handleRefresh = useCallback(async () => {
    if (searchQuery.trim().length === 0) return;
    setRefreshing(true);
    await handleSearch(searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  const renderListHeader = () => {
    if (searchQuery.trim().length === 0 || genres.length === 0) return null;

    return (
      <View style={styles.genresWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genresContainer}
        >
          {genres.map((genre) => (
            <GenreTag
              key={genre.sys.id}
              name={genre.fields.name}
              onPress={() =>
                router.push(
                  `/(tabs)/search/genre/${encodeURIComponent(genre.fields.name)}`
                )
              }
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingBottom: bottomPadding }]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: textColor,
              borderColor: textColor,
              backgroundColor: backgroundColor,
            },
          ]}
          placeholder="Search shows and genres..."
          placeholderTextColor={textColor + "80"}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={() => handleSearch("")}
          >
            <Ionicons name="close" size={40} color={textColor} />
          </Pressable>
        )}
      </View>

      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      )}

      {error && (
        <View style={styles.centerContainer}>
          <ThemedText>{error}</ThemedText>
        </View>
      )}

      {!loading &&
        !error &&
        searchQuery.trim().length > 0 &&
        results.length === 0 && (
          <View style={styles.centerContainer}>
            <ThemedText>No shows found</ThemedText>
          </View>
        )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          renderItem={({ item }) => (
            <ShowCard
              imageUrl={
                item.coverImage?.startsWith("//")
                  ? `https:${item.coverImage}`
                  : item.coverImage
              }
              audioUrl={item.mixcloudLink}
              title={item.title}
              date={formatDate(item.date)}
              genres={item.genres}
              onPress={() => router.push(`/(tabs)/search/${item.slug}`)}
              showId={item.id}
              slug={item.slug}
            />
          )}
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

      {!loading && !error && searchQuery.trim().length === 0 && (
        <View style={styles.centerContainer}>
          <ThemedText>Start typing to search shows and genres</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  searchContainer: {
    position: "relative",
  },
  searchInput: {
    height: 56,
    borderBottomWidth: 1,
    fontSize: 43,
    fontFamily: "ABCArizonaFlare",
    paddingRight: 40,
    paddingVertical: 4,
  },
  clearButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 100,
  },
  genresWrapper: {
    marginTop: 12,
    marginBottom: 12,
  },
  genresContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
});
