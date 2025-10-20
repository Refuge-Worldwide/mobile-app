import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface Playlist {
  id: string;
  name: string;
  image: any; // require() result type
}

const PLAYLISTS: Playlist[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    image: require('@/assets/images/favourites.jpg'),
  },
  // Add more playlists here in the future
];

export default function PlaylistScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handlePlaylistPress = (playlistId: string) => {
    router.push(`/(tabs)/playlist/playlist/${playlistId}`);
  };

  const handleSignInPress = () => {
    router.push('/(tabs)/account');
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyTitle}>
            Sign in to view playlists
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            Create an account to save your favorite shows and create playlists
          </ThemedText>
          <ThemedButton title="Go to Account" onPress={handleSignInPress} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.playlistsList}>
          {PLAYLISTS.map((playlist) => (
            <Pressable
              key={playlist.id}
              onPress={() => handlePlaylistPress(playlist.id)}
            >
              <Image
                source={playlist.image}
                style={styles.playlistImage}
                resizeMode="cover"
              />
              <View>
                <ThemedText style={styles.playlistName}>
                  {playlist.name}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  playlistsList: {
    gap: 16,
  },
  playlistImage: {
    width: '100%',
    height: 200,
  },
  playlistName: {
    marginTop: 4,
    marginBottom: 4,
  },
});
