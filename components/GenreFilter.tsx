import { useThemeColor } from '@/hooks/useThemeColor';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface GenreFilterProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
  genres: string[];
  genresLoading?: boolean;
  genresError?: string | null;
  onRetryLoadGenres?: () => void;
}

export function GenreFilter({
  selectedGenres,
  onGenreToggle,
  onClearAll,
  onClose,
  genres,
  genresLoading = false,
  genresError = null,
  onRetryLoadGenres
}: GenreFilterProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter genres based on search query
  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return genres;
    const query = searchQuery.toLowerCase();
    return genres.filter((genre: string) => genre.toLowerCase().includes(query));
  }, [searchQuery, genres]); return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        {selectedGenres.length > 0 && (
          <Pressable onPress={onClearAll}>
            <ThemedText style={styles.clearButton}>Clear All</ThemedText>
          </Pressable>
        )}
      </View> */}

      {/* Search Input */}
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
          placeholder="Search genres..."
          placeholderTextColor={textColor + '80'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Genre List */}
      <BottomSheetScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.genresList}>
          {genresLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={textColor} />
              <ThemedText style={styles.loadingText}>Loading genres...</ThemedText>
            </View>
          ) : genresError ? (
            <View style={styles.errorState}>
              <ThemedText style={styles.errorText}>{genresError}</ThemedText>
              {onRetryLoadGenres && (
                <Pressable onPress={onRetryLoadGenres} style={[styles.retryButton, { borderColor: textColor }]}>
                  <ThemedText style={[styles.retryText, { color: textColor }]}>Retry</ThemedText>
                </Pressable>
              )}
            </View>
          ) : filteredGenres.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {genres.length === 0 ? 'No genres available' : 'No genres found'}
              </ThemedText>
            </View>
          ) : (
            filteredGenres.map((genre: string) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <Pressable
                  key={genre}
                  style={[
                    styles.genreButton,
                    {
                      backgroundColor: isSelected ? textColor : 'transparent',
                      borderColor: textColor,
                    },
                  ]}
                  onPress={() => {
                    onGenreToggle(genre);
                    onClose?.();
                  }}
                >
                  <ThemedText type="tag" style={
                    { color: isSelected ? backgroundColor : textColor }
                  }>
                    {genre}
                  </ThemedText>
                </Pressable>
              );
            })
          )}
        </View>
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    opacity: 0.7,
  },
  searchContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  searchInput: {
    height: 48,
    borderBottomWidth: 1,
    fontSize: 43,
    fontFamily: 'ABCArizonaFlare',
    paddingRight: 40,
  },
  scrollView: {
    flex: 1,
  },
  genresList: {
    gap: 12,
    paddingBottom: 16,
  },
  genreButton: {
    width: '100%',
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  selectedCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  errorState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
