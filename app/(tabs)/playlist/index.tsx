import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getFavouritesWithShows } from "@/lib/favourites";
import { ApiPlaylist, fetchPlaylistBySlug, fetchPlaylists } from "@/lib/playlistsApi";
import { useAudioStore } from "@/store/audioStore";
import { ensureHttps } from "@/utils/imageOptimization";
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
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  const setTrack = useAudioStore((state) => state.setTrack);
  const addToQueue = useAudioStore((state) => state.addToQueue);
  const clearQueue = useAudioStore((state) => state.clearQueue);

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

  const handlePlayFavorites = async (e: any) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const shows = await getFavouritesWithShows();
      const playable = shows.filter((s) => s.mixcloudLink?.includes("soundcloud.com"));
      if (playable.length === 0) return;
      clearQueue();
      const first = playable[0];
      setTrack({
        id: first.title,
        url: first.mixcloudLink!,
        title: first.title,
        artist: first.date ?? "",
        artwork: ensureHttps(first.coverImage || first.artwork),
        mode: "archive",
        isLive: false,
        showId: first.id,
        slug: first.slug,
      });
      playable.slice(1, 30).forEach((s) => {
        addToQueue({
          id: s.title,
          url: s.mixcloudLink!,
          title: s.title,
          artist: s.date ?? "",
          artwork: ensureHttps(s.coverImage || s.artwork),
          mode: "archive",
          isLive: false,
          showId: s.id,
          slug: s.slug,
        });
      });
    } catch (err) {
      console.error("Error playing favorites:", err);
    }
  };

  const handlePlayPlaylist = async (e: any, slug: string) => {
    e.stopPropagation();
    try {
      const playlist = await fetchPlaylistBySlug(slug);
      const playable = playlist.shows.filter((s) => s.mixcloudLink?.includes("soundcloud.com"));
      if (playable.length === 0) return;
      clearQueue();
      const first = playable[0];
      setTrack({
        id: first.title,
        url: first.mixcloudLink!,
        title: first.title,
        artist: first.date ?? "",
        artwork: ensureHttps(first.coverImage || first.artwork),
        mode: "archive",
        isLive: false,
        showId: first.id,
        slug: first.slug,
      });
      playable.slice(1, 30).forEach((s) => {
        addToQueue({
          id: s.title,
          url: s.mixcloudLink!,
          title: s.title,
          artist: s.date ?? "",
          artwork: ensureHttps(s.coverImage || s.artwork),
          mode: "archive",
          isLive: false,
          showId: s.id,
          slug: s.slug,
        });
      });
    } catch (err) {
      console.error("Error playing playlist:", err);
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
            <View style={styles.imageContainer}>
              <Image
                source={require("@/assets/images/favourites.jpg")}
                style={styles.playlistImage}
                contentFit="cover"
              />
              {user && (
                <View style={styles.buttonContainer}>
                  <Pressable
                    style={[styles.iconButton, { backgroundColor: textColor }]}
                    onPress={handlePlayFavorites}
                  >
                    <Icon name="play" size={40} color={backgroundColor} />
                  </Pressable>
                </View>
              )}
            </View>
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
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: playlist.image }}
                    style={styles.playlistImage}
                    contentFit="cover"
                  />
                  <View style={styles.buttonContainer}>
                    <Pressable
                      style={[styles.iconButton, { backgroundColor: textColor }]}
                      onPress={(e) => handlePlayPlaylist(e, playlist.slug)}
                    >
                      <Icon name="play" size={40} color={backgroundColor} />
                    </Pressable>
                  </View>
                </View>
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
  imageContainer: {
    position: "relative",
  },
  playlistImage: {
    width: "100%",
    height: 200,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistName: {
    marginTop: 4,
    marginBottom: 4,
  },
  loader: {
    marginTop: 16,
  },
});
