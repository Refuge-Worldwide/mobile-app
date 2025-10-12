import { BottomSheet } from '@/components/BottomSheet';
import { GenreFilter } from '@/components/GenreFilter';
import { ShowCard } from '@/components/ShowCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Show } from '@/types/shows';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

const API_BASE_URL = 'https://refugeworldwide.com/api/shows';
const GENRES_API_URL = 'https://refugeworldwide.com/api/genres';
const ITEMS_PER_PAGE = 20;

type TabType = 'featured' | 'latest' | 'genre';

export default function Archive() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [genres, setGenres] = useState<string[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresError, setGenresError] = useState<string | null>(null);

  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  const fetchShows = useCallback(async (currentSkip: number, genres: string[] = []) => {
    if (loading) return;

    setLoading(true);
    try {
      const genreFilter = genres.length > 0 ? genres.join(',') : '';
      const response = await fetch(
        `${API_BASE_URL}?take=${ITEMS_PER_PAGE}&skip=${currentSkip}&filter=${genreFilter}`
      );
      const data: Show[] = await response.json();

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
          return [...prev, ...data];
        });
      }
      setSkip(currentSkip + ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const fetchGenres = useCallback(async () => {
    setGenresLoading(true);
    setGenresError(null);
    try {
      const response = await fetch(GENRES_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch genres');
      }
      const data = await response.json();
      // Assuming the API returns an array of strings or objects with name property
      const genreNames = Array.isArray(data)
        ? data.map(genre => typeof genre === 'string' ? genre : genre.name || genre.title || genre)
        : [];
      setGenres(genreNames);
    } catch (err) {
      console.error('Error fetching genres:', err);
      setGenresError('Failed to load genres');
      // Fallback to hardcoded genres on error
      setGenres(['Bass', 'Bleep', 'Blues', 'Ambient', 'Afrohouse', 'Afrobeat']);
    } finally {
      setGenresLoading(false);
    }
  }, []);

  useEffect(() => {
    setShows([]);
    setSkip(0);
    setHasMore(true);
    fetchShows(0, selectedGenres);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenres]);

  // Load genres when component mounts
  useEffect(() => {
    fetchGenres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchShows(skip, selectedGenres);
    }
  };

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
    setActiveTab('latest');
  };

  const openGenreFilter = () => {
    bottomSheetRef.current?.present();
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
        audioUrl="https://downloads.ctfassets.net/taoiy3h84mql/4js8WfDtP9bkEDjpg4hFzu/a04cd029a0a8967eca15c7191297b6a6/Dub_Dal_takeover__Body__Mind___Bass_-_Aarti_Kriplani___Zena__-_03_Oct_2025.mp3"
        title={item.title}
        date={formatDate(item.date)}
        genres={item.genres}
        isFavorited={isFavorited}
        onFavoritePress={() => toggleFavorite(item.id)}
        onPress={() => router.push(`/(tabs)/radio/${item.slug}`)}
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
            activeTab === 'featured' && styles.tabActive,
            { borderColor: textColor, opacity: 0.5 }
          ]}
          disabled
        >
          <ThemedText style={[
            styles.tabText,
            activeTab === 'features' && styles.tabTextActive,
            { color: textColor }
          ]}>
            Featured
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'latest' && styles.tabActive,
            { borderColor: textColor, backgroundColor: activeTab === 'latest' ? textColor : 'transparent' }
          ]}
          onPress={() => setActiveTab('latest')}
        >
          <ThemedText style={[
            styles.tabText,
            activeTab === 'latest' && styles.tabTextActive,
            { color: activeTab === 'latest' ? backgroundColor : textColor }
          ]}>
            Latest
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'genre' && styles.tabActive,
            { borderColor: textColor, backgroundColor: activeTab === 'genre' ? textColor : 'transparent' }
          ]}
          onPress={() => {
            setActiveTab('genre');
            openGenreFilter();
          }}
        >
          <ThemedText style={[
            styles.tabText,
            activeTab === 'genre' && styles.tabTextActive,
            { color: activeTab === 'genre' ? backgroundColor : textColor }
          ]}>
            Genre
          </ThemedText>
        </Pressable>
      </View>

      {/* Selected Genres Header */}
      {selectedGenres.length > 0 && (
        <View style={[styles.genreHeader, { borderBottomColor: textColor }]}>
          <ThemedText style={styles.genreHeaderText}>
            Filtered by: {selectedGenres.join(', ')}
          </ThemedText>
          <Pressable onPress={handleClearGenres}>
            <Ionicons name="close-circle" size={20} color={textColor} />
          </Pressable>
        </View>
      )}

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

      {/* Genre Filter Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['70%', '90%']}
      >
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
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    // Active styling handled by backgroundColor prop
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    // Active text color handled by color prop
  },
  genreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  genreHeaderText: {
    fontSize: 14,
    fontWeight: '500',
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
