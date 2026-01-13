import { ShowCard } from '@/components/ShowCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

interface Show {
  id: string;
  title: string;
  slug: string;
  date: string;
  coverImage: string;
  mixcloudLink: string;
  genres: string[];
}

interface SearchResponse {
  shows: Show[];
  articles: any[];
  artists: any[];
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const router = useRouter();

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
      const response = await fetch(`https://refugeworldwide.com/api/search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      const data: SearchResponse = await response.json();
      setResults(data.shows || []);
    } catch (err) {
      console.error('Error searching:', err);
      setError('Failed to load search results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleRefresh = useCallback(async () => {
    if (searchQuery.trim().length === 0) return;
    setRefreshing(true);
    await handleSearch(searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              color: textColor,
              borderColor: textColor,
              backgroundColor: backgroundColor,
            }
          ]}
          placeholder="Search shows..."
          placeholderTextColor={textColor + '80'}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={() => handleSearch('')}
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

      {!loading && !error && searchQuery.trim().length > 0 && results.length === 0 && (
        <View style={styles.centerContainer}>
          <ThemedText>No shows found</ThemedText>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShowCard
              imageUrl={item.coverImage?.startsWith('//') ? `https:${item.coverImage}` : item.coverImage}
              audioUrl={item.mixcloudLink}
              title={item.title}
              date={formatDate(item.date)}
              genres={item.genres}
              onPress={() => router.push(`/(tabs)/search/${item.slug}`)}
              showId={item.id}
              slug={item.slug}
            />
          )}
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

      {!loading && !error && searchQuery.trim().length === 0 && (
        <View style={styles.centerContainer}>
          <ThemedText>Start typing to search shows</ThemedText>
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
    paddingBottom: 24
  },
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    height: 48,
    borderBottomWidth: 1,
    fontSize: 43,
    fontFamily: 'ABCArizonaFlare',
    paddingRight: 40,
    lineHeight: 50,
  },
  clearButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
});