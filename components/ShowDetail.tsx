import { Icon } from "@/components/Icon";
import { ShowCard } from "@/components/ShowCard";
import { ShowCardSeparator } from "@/components/ShowCardSeparator";
import { ShowDetailSkeleton } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useBottomSafePadding } from "@/hooks/useBottomSafePadding";
import { useThemeColor } from "@/hooks/useThemeColor";
import { isFavourited, toggleFavourite } from "@/lib/favourites";
import { pushShowDetail, ShowNavigationPrefix } from "@/lib/navigation";
import { Artist } from "@/types/artists";
import { Show } from "@/types/shows";
import { ensureHttps, optimizeArtistImage } from "@/utils/imageOptimization";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";

const API_BASE_URL = "https://refugeworldwide.com/api/shows";
const ARTIST_API_BASE_URL = "https://refugeworldwide.com/api/artists";

interface ShowDetailProps {
  navigationPrefix: ShowNavigationPrefix;
}

export function ShowDetail({ navigationPrefix }: ShowDetailProps) {
  const { slug, cached } = useLocalSearchParams<{
    slug: string;
    // Optional JSON-encoded Show, already known from wherever the caller
    // navigated here (the archive list, a related-show card, ...) — lets
    // this screen render instantly (same image, title, date, genres) while
    // the full fetch below fills in description/artists/relatedShows in
    // the background, instead of blocking on a skeleton for data we
    // already had.
    cached?: string;
  }>();
  const router = useRouter();
  const { user, isPaidSupporter } = useAuth();
  const cachedShow = useMemo<Show | null>(() => {
    if (!cached) return null;
    try {
      return JSON.parse(cached) as Show;
    } catch {
      return null;
    }
  }, [cached]);
  const [show, setShow] = useState<Show | null>(cachedShow);
  const [loading, setLoading] = useState(!cachedShow);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionLong, setIsDescriptionLong] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<
    Map<string, Artist & { shows?: Show[] }>
  >(new Map());
  const [artistsLoading, setArtistsLoading] = useState(false);

  const textColor = useThemeColor({}, "text");
  const bottomPadding = useBottomSafePadding();

  useEffect(() => {
    if (!slug) return;
    // Swap the displayed show immediately on navigation to a new slug —
    // either the cached one (no loading state) or nothing yet (skeleton).
    if (cachedShow) {
      setShow(cachedShow);
      setLoading(false);
    } else {
      setShow(null);
      setLoading(true);
    }
    fetchShow(slug, { silent: !!cachedShow });
    // Only re-run when navigating to a different show.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    // Favouriting is a supporter perk, not just a signed-in one — skip the
    // check (and its network call) entirely for a signed-in-but-unpaid
    // account, same as the heart would never have anything to show for them.
    if (isPaidSupporter && show) {
      checkFavoriteStatus();
    }
  }, [isPaidSupporter, show?.id]);

  useEffect(() => {
    if (show?.artists && show.artists.length > 0) {
      fetchArtistDetails();
    }
  }, [show?.artists]);

  // `silent` skips the loading flag — used when we already have cached
  // data on screen and this is just a background refresh/fill-in.
  const fetchShow = async (showSlug: string, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${showSlug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch show");
      }
      const data = await response.json();

      // Transform the API response to match our Show type
      const transformedShow: Show = {
        id: data.show.sys?.id || data.show.id,
        title: data.show.title,
        date: data.show.date,
        slug: data.show.slug,
        mixcloudLink: data.show.mixcloudLink,
        audioFile: data.show.audioFile?.url || data.show.audioFile,
        coverImage: data.show.coverImage?.url || data.show.coverImage,
        genres:
          data.show.genresCollection?.items?.map((g: any) => g.name) || [],
        artwork: data.show.coverImage?.url,
        description: data.show.description,
        relatedShows: data.relatedShows || [],
        artists:
          data.show.artistsCollection?.items?.map((a: any) => ({
            id: a.sys?.id || a.id || a.slug,
            name: a.name,
            slug: a.slug,
          })) || [],
      };

      setShow(transformedShow);
    } catch (err) {
      console.error("Error fetching show:", err);
      // We already have cached data on screen — don't blow it away with an
      // error state over a background refresh failing.
      if (!silent) setError("Failed to load show");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Kept for backwards compatibility with ShowCard usage
  const getImageUrl = ensureHttps;

  const handleRelatedShowPress = (relatedShow: Show) => {
    // Related-show cards already carry everything ShowDetail needs for an
    // instant render — same instant-render trick as every other list.
    pushShowDetail(router, navigationPrefix, relatedShow);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://refugeworldwide.com/radio/${slug}`;
      const shareMessage = `🎵 Check out ${show?.title} on Refuge Worldwide`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!show?.id) return;
    const favourited = await isFavourited(show.id);
    setIsFavorite(favourited);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to favorite shows");
      return;
    }

    // Favouriting is a supporter perk — being signed in isn't enough on
    // its own, since every account starts out unpaid.
    if (!isPaidSupporter) {
      Alert.alert(
        "Account setup incomplete",
        "Favouriting shows is a supporter feature, please complete your account setup.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Complete Setup",
            onPress: () => router.push("/(tabs)/account"),
          },
        ],
      );
      return;
    }

    if (!show?.id) return;

    setFavoriteLoading(true);
    const { error } = await toggleFavourite(show.id);
    setFavoriteLoading(false);

    if (error) {
      Alert.alert("Error", "Failed to update favorite");
    } else {
      setIsFavorite(!isFavorite);
    }
  };

  const fetchArtistDetails = async () => {
    if (!show?.artists) return;

    setArtistsLoading(true);
    const details = new Map<string, Artist & { shows?: Show[] }>();

    try {
      await Promise.all(
        show.artists.map(async (artist) => {
          try {
            const response = await fetch(
              `${ARTIST_API_BASE_URL}/${artist.slug}`,
            );
            if (response.ok) {
              const data = await response.json();

              // Transform artist shows
              const transformedShows: Show[] = (data.shows || []).map(
                (s: any) => ({
                  id: s.id || "",
                  title: s.title || "",
                  date: s.date || "",
                  slug: s.slug || "",
                  mixcloudLink: s.mixcloudLink,
                  audioFile: s.audioFile,
                  coverImage: s.coverImage,
                  genres: Array.isArray(s.genres) ? s.genres : [],
                  artwork: s.coverImage,
                  description: s.description,
                }),
              );

              const transformedArtist: Artist & { shows?: Show[] } = {
                id: data.sys?.id || data.id || data.slug,
                name: data.name,
                slug: data.slug,
                photo: data.photo?.url || data.photo,
                coverImage: data.coverImage?.url || data.coverImage,
                bio: data.description,
                shows: transformedShows,
              };
              details.set(artist.slug, transformedArtist);
            }
          } catch (err) {
            console.error(`Error fetching artist ${artist.slug}:`, err);
          }
        }),
      );
      setArtistDetails(details);
    } finally {
      setArtistsLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ShowDetailSkeleton />
      </ThemedView>
    );
  }

  if (error || !show) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText>{error || "Show not found"}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const imageUrl = getImageUrl(show.coverImage || show.artwork);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Show Card */}
        <View style={styles.showCardWrapper}>
          <ShowCard
            imageUrl={imageUrl}
            title={show.title}
            date={formatDate(show.date)}
            genres={show.genres}
            mixcloudLink={show.mixcloudLink}
            showId={show.id}
            slug={show.slug}
            disableNavigation
          />

          {/* Description */}
          {show.description && (
            <View style={styles.descriptionContainer}>
              {!isDescriptionLong && (
                <ThemedText
                  onTextLayout={(e) => {
                    if (e.nativeEvent.lines.length > 5) {
                      setIsDescriptionLong(true);
                    }
                  }}
                  style={{ position: "absolute", opacity: 0 }}
                >
                  {show.description}
                </ThemedText>
              )}
              <ThemedText numberOfLines={isDescriptionExpanded ? undefined : 5}>
                {show.description}
              </ThemedText>
              {isDescriptionLong && (
                <Pressable
                  onPress={() =>
                    setIsDescriptionExpanded(!isDescriptionExpanded)
                  }
                >
                  <ThemedText
                    style={[styles.viewMoreText, { color: textColor }]}
                  >
                    {isDescriptionExpanded ? "show less" : "show more"}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleToggleFavorite}
              style={styles.actionButton}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" />
              ) : (
                <Icon
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={24}
                  color={isFavorite ? textColor : undefined}
                />
              )}
            </Pressable>
            <Pressable onPress={handleShare} style={styles.actionButton}>
              <Icon name="share" size={24} />
            </Pressable>
          </View>
        </View>

        {/* Artists */}
        {show.artists && show.artists.length > 0 && (
          <View
            style={[
              styles.artistsSection,
              { borderTopColor: textColor, borderTopWidth: 1 },
            ]}
          >
            <View>
              {show.artists.map((artist, index) => {
                const artistDetail = artistDetails.get(artist.slug);
                const artistImage =
                  artistDetail?.photo || artistDetail?.coverImage;

                return (
                  <View key={`${artist.slug}-${index}`}>
                    <Pressable
                      onPress={() =>
                        router.push(
                          `${navigationPrefix}/artist/${artist.slug}` as any,
                        )
                      }
                      style={[
                        styles.artistItem,
                        { borderBottomColor: textColor },
                      ]}
                    >
                      <View style={styles.artistContent}>
                        <View style={styles.artistImageContainer}>
                          {artistImage ? (
                            <Image
                              source={{ uri: optimizeArtistImage(artistImage) }}
                              style={styles.artistImage}
                              key={optimizeArtistImage(artistImage)}
                            />
                          ) : (
                            <View
                              style={[
                                styles.artistImage,
                                styles.artistImageSkeleton,
                                { backgroundColor: textColor, opacity: 0.1 },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.artistInfo}>
                          <ThemedText style={styles.artistName}>
                            {artist.name}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Related Shows */}
        {show.relatedShows && show.relatedShows.length > 0 && (
          <View style={styles.relatedShowsSection}>
            <ThemedText type="subtitle" style={{ marginBottom: 10 }}>
              Related Shows
            </ThemedText>
            <View>
              {show.relatedShows.map((relatedShow, index) => (
                <View key={relatedShow.id}>
                  <ShowCard
                    imageUrl={getImageUrl(
                      relatedShow.coverImage || relatedShow.artwork,
                    )}
                    title={relatedShow.title}
                    date={formatDate(relatedShow.date)}
                    genres={relatedShow.genres}
                    mixcloudLink={relatedShow.mixcloudLink}
                    onPress={() => handleRelatedShowPress(relatedShow)}
                    showId={relatedShow.id}
                    slug={relatedShow.slug}
                  />
                  {index < show.relatedShows.length - 1 && <ShowCardSeparator />}
                </View>
              ))}
            </View>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  showCardWrapper: {
    marginBottom: 24,
  },
  descriptionContainer: {
    marginTop: 4,
    paddingBottom: 4,
  },
  viewMoreText: {
    textDecorationLine: "underline",
  },
  relatedShowsSection: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  actionButton: {
    padding: 0,
  },
  artistsSection: {
    marginTop: 0,
    marginBottom: 42,
  },
  artistsHeader: {
    paddingBottom: 8,
  },
  artistItem: {
    // paddingVertical: 12,
    borderBottomWidth: 1,
  },
  artistItemLast: {
    borderBottomWidth: 0,
  },
  artistContent: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  artistImageContainer: {
    width: 80,
    aspectRatio: 16 / 9,
  },
  artistImage: {
    width: "100%",
    height: "100%",
  },
  artistImageSkeleton: {
    borderRadius: 4,
  },
  artistInfo: {
    flex: 1,
    justifyContent: "center",
  },
  artistName: {
    fontSize: 16,
    fontWeight: "600",
  },
  artistBio: {
    fontSize: 13,
    opacity: 0.8,
  },
  artistShowsSection: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  artistShowsSectionLast: {
    borderBottomWidth: 0,
  },
  artistShowsHeader: {
    marginBottom: 10,
  },
});
