import { directus } from "@/lib/directus";
import { Show } from "@/types/shows";
import { createItem, deleteItems, readItems } from "@directus/sdk";
import Constants from "expo-constants";

const BACKEND_API_URL =
  Constants.expoConfig?.extra?.backendApiUrl ||
  process.env.EXPO_PUBLIC_API_URL;

export interface Favourite {
  id: number;
  user_created: string | null;
  show_id: string;
  date_created: string;
}

/**
 * Add a show to user's favourites
 * @param showId - The immutable show ID (not slug, as slugs can change)
 */
export async function addFavourite(showId: string) {
  if (!(await directus.getToken())) {
    return { data: null, error: new Error("User not authenticated") };
  }

  try {
    const data = await directus.request(
      createItem("show_favourites", { show_id: showId }),
    );
    return { data, error: null as Error | null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

/**
 * Remove a show from user's favourites
 * @param showId - The immutable show ID
 */
export async function removeFavourite(showId: string) {
  if (!(await directus.getToken())) {
    return { error: new Error("User not authenticated") };
  }

  try {
    await directus.request(
      deleteItems("show_favourites", {
        filter: { show_id: { _eq: showId } },
      }),
    );
    return { error: null as Error | null };
  } catch (error) {
    return { error: toError(error) };
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Check if a show is favourited by the current user
 * @param showId - The immutable show ID
 */
export async function isFavourited(showId: string): Promise<boolean> {
  if (!(await directus.getToken())) return false;

  try {
    const data = await directus.request(
      readItems("show_favourites", {
        filter: { show_id: { _eq: showId } },
        limit: 1,
      }),
    );
    return data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get all favourites for the current user
 * Returns only the show IDs - you'll need to fetch show details separately
 */
export async function getFavourites(): Promise<Favourite[]> {
  if (!(await directus.getToken())) return [];

  try {
    const data = await directus.request(
      readItems("show_favourites", {
        sort: ["-date_created"],
      }),
    );
    return data as unknown as Favourite[];
  } catch (error) {
    console.error("Error fetching favourites:", error);
    return [];
  }
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
    if (!(await directus.getToken())) {
      return [];
    }

    // Get favourite show IDs from Directus
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
          audioFile: apiShow.audioFile?.url || apiShow.audioFile,
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
