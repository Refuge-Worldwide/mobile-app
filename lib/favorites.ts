import { supabase } from './supabase';

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
  const { data, error } = await supabase
    .from('show_favorites')
    .insert({
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
