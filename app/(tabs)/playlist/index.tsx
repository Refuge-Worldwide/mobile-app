import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { ApiPlaylist, fetchPlaylists } from "@/lib/playlistsApi";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";


export default function PlaylistScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const bottomPadding = useBottomSafePadding();
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylists()
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFavoritesPress = () => {
    if (user) {
      router.push("/(tabs)/playlist/playlist/favorites");
    } else {
      router.push("/(tabs)/account");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {/* Favorites — always first */}
          <Pressable onPress={handleFavoritesPress}>
            <Image
              source={require("@/assets/images/favourites.jpg")}
              style={styles.playlistImage}
              contentFit="cover"
            />
            <ThemedText style={styles.playlistName}>
              {user ? "Favorites" : "Sign in for Favorites"}
            </ThemedText>
          </Pressable>

          {/* API playlists */}
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                onPress={() =>
                  router.push(`/(tabs)/playlist/playlist/${playlist.slug}`)
                }
              >
                <Image
                  source={{ uri: playlist.image }}
                  style={styles.playlistImage}
                  contentFit="cover"
                />
                <ThemedText style={styles.playlistName}>
                  {playlist.title}
                </ThemedText>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  list: {
    gap: 16,
  },
  playlistImage: {
    width: "100%",
    height: 200,
  },
  playlistName: {
    marginTop: 4,
    marginBottom: 4,
  },
  loader: {
    marginTop: 16,
  },
});
