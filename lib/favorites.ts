import { supabase } from './supabase';
import { Show } from '@/types/shows';
import Constants from 'expo-constants';

const BACKEND_API_URL = Constants.expoConfig?.extra?.backendApiUrl || process.env.EXPO_PUBLIC_BACKEND_API_URL;

export interface Favorite {
  id: string;
  user_id: string;
  show_id: string;
  created_at: string;
}

/**
 * Add a show to user's favorites
 * @param showId - The immutable show ID (not slug, as slugs can change)
 */
export async function addFavorite(showId: string) {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('show_favorites')
    .insert({
      user_id: user.id,
      show_id: showId,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Remove a show from user's favorites
 * @param showId - The immutable show ID
 */
export async function removeFavorite(showId: string) {
  const { error } = await supabase
    .from('show_favorites')
    .delete()
    .eq('show_id', showId);

  return { error };
}

/**
 * Check if a show is favorited by the current user
 * @param showId - The immutable show ID
 */
export async function isFavorited(showId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('show_favorites')
    .select('id')
    .eq('show_id', showId)
    .single();

  if (error) return false;
  return !!data;
}

/**
 * Get all favorites for the current user
 * Returns only the show IDs - you'll need to fetch show details separately
 */
export async function getFavorites(): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('show_favorites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data || [];
}

/**
 * Toggle favorite status for a show
 * @param showId - The immutable show ID
 */
export async function toggleFavorite(showId: string) {
  const favorited = await isFavorited(showId);

  if (favorited) {
    return await removeFavorite(showId);
  } else {
    return await addFavorite(showId);
  }
}

/**
 * Get all favorites for the current user with enriched show data
 * Calls the backend API to enrich show IDs with full show information
 */
export async function getFavoritesWithShows(): Promise<Show[]> {
  try {
    // Get the current user session for authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('No active session');
      return [];
    }

    // Get favorite show IDs from Supabase
    const favorites = await getFavorites();

    if (favorites.length === 0) {
      console.log('No favorites found');
      return [];
    }

    const showIds = favorites.map((f) => f.show_id);

    // Check if backend API URL is configured
    if (!BACKEND_API_URL) {
      console.error('BACKEND_API_URL is not configured. Please set EXPO_PUBLIC_BACKEND_API_URL in .env.local');
      throw new Error('Backend API URL not configured');
    }

    console.log('Fetching shows from backend API for IDs:', showIds);

    // Fetch each show from the backend API using /api/shows/by-id/[id]
    const showPromises = showIds.map(async (showId) => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/api/shows/by-id/${showId}`, {
          method: 'GET',
        });

        if (!response.ok) {
          console.error(`Failed to fetch show ${showId}: ${response.status}`);
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
          genres: apiShow.genresCollection?.items?.map((g: any) => g.name) || [],
          artwork: apiShow.coverImage?.url,
          description: apiShow.description,
          relatedShows: data.relatedShows || [],
        };

        return transformedShow;
      } catch (error) {
        console.error(`Error fetching show ${showId}:`, error);
        return null;
      }
    });

    // Wait for all shows to be fetched
    const enrichedShows = await Promise.all(showPromises);

    // Filter out any null results (failed fetches)
    const validShows = enrichedShows.filter((show): show is Show => show !== null);

    console.log('Enriched shows count:', validShows.length);

    return validShows;
  } catch (error) {
    console.error('Error fetching favorites with shows:', error);
    // Re-throw the error so the UI can display it
    throw error;
  }
}
