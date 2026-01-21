import { Show } from "@/types/shows";
import Constants from "expo-constants";
import { supabase } from "./supabase";

const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl ||
  process.env.EXPO_PUBLIC_BACKEND_API_URL;

export interface Favourite {
  id: string;
  user_id: string;
  show_id: string;
  created_at: string;
}

/**
 * Add a show to user's favourites
 * @param showId - The immutable show ID (not slug, as slugs can change)
 */
export async function addFavourite(showId: string) {
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("User not authenticated") };
  }

  const { data, error } = await supabase
    .from("show_favourites")
    .insert({
      user_id: user.id,
      show_id: showId,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Remove a show from user's favourites
 * @param showId - The immutable show ID
 */
export async function removeFavourite(showId: string) {
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("User not authenticated") };
  }

  const { error } = await supabase
    .from("show_favourites")
    .delete()
    .eq("user_id", user.id)
    .eq("show_id", showId);

  return { error };
}

/**
 * Check if a show is favourited by the current user
 * @param showId - The immutable show ID
 */
export async function isFavourited(showId: string): Promise<boolean> {
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("show_favourites")
    .select("id")
    .eq("user_id", user.id)
    .eq("show_id", showId)
    .single();

  if (error) return false;
  return !!data;
}

/**
 * Get all favourites for the current user
 * Returns only the show IDs - you'll need to fetch show details separately
 */
export async function getFavourites(): Promise<Favourite[]> {
  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("show_favourites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching favourites:", error);
    return [];
  }

  return data || [];
}

/**
 * Toggle favourite status for a show
 * @param showId - The immutable show ID
 */
export async function toggleFavourite(showId: string) {
  const favourited = await isFavourited(showId);

  if (favourited) {
    return await removeFavourite(showId);
  } else {
    return await addFavourite(showId);
  }
}

/**
 * Get all favourites for the current user with enriched show data
 * Calls the backend API to enrich show IDs with full show information
 */
export async function getFavouritesWithShows(): Promise<Show[]> {
  try {
    // Get the current user session for authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return [];
    }

    // Get favourite show IDs from Supabase
    const favourites = await getFavourites();

    if (favourites.length === 0) {
      return [];
    }

    const showIds = favourites.map((f) => f.show_id);

    // Check if backend API URL is configured
    if (!BACKEND_API_URL) {
      console.error(
        "BACKEND_API_URL is not configured. Please set EXPO_PUBLIC_BACKEND_API_URL in .env.local",
      );
      throw new Error("Backend API URL not configured");
    }

    // Fetch each show from the backend API using /api/shows/by-id/[id]
    const showPromises = showIds.map(async (showId) => {
      try {
        const response = await fetch(
          `${BACKEND_API_URL}/api/shows/by-id/${showId}`,
          {
            method: "GET",
          },
        );

        if (!response.ok) {
          // Show may have been deleted/unpublished - just skip it
          return null;
        }

        const data = await response.json();

        // Transform the API response to match our Show type
        const apiShow = data.show;
        const transformedShow: Show = {
          id: apiShow.sys?.id || apiShow.id,
          title: apiShow.title,
          date: apiShow.date,
          slug: apiShow.slug,
          mixcloudLink: apiShow.mixcloudLink,
          coverImage: apiShow.coverImage?.url || apiShow.coverImage,
          genres:
            apiShow.genresCollection?.items?.map((g: any) => g.name) || [],
          artwork: apiShow.coverImage?.url,
          description: apiShow.description,
          relatedShows: data.relatedShows || [],
        };

        return transformedShow;
      } catch (error) {
        return null;
      }
    });

    // Wait for all shows to be fetched
    const enrichedShows = await Promise.all(showPromises);

    // Filter out any null results (failed fetches)
    const validShows = enrichedShows.filter(
      (show): show is Show => show !== null,
    );

    return validShows;
  } catch (error) {
    console.error("Error fetching favourites with shows:", error);
    // Re-throw the error so the UI can display it
    throw error;
  }
}
