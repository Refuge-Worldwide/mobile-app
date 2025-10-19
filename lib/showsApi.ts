import { Show } from '@/types/shows';

const API_BASE_URL = 'https://refugeworldwide.com/api/shows';

/**
 * Fetch a single show by slug
 */
export async function fetchShowBySlug(slug: string): Promise<Show | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${slug}`);
    if (!response.ok) {
      throw new Error('Failed to fetch show');
    }
    const data = await response.json();

    // Transform the API response to match our Show type
    const transformedShow: Show = {
      id: data.show.sys?.id || data.show.id,
      title: data.show.title,
      date: data.show.date,
      slug: data.show.slug,
      mixcloudLink: data.show.mixcloudLink,
      coverImage: data.show.coverImage?.url || data.show.coverImage,
      genres: data.show.genresCollection?.items?.map((g: any) => g.name) || [],
      artwork: data.show.coverImage?.url,
      description: data.show.description,
      relatedShows: data.relatedShows || [],
    };

    return transformedShow;
  } catch (error) {
    console.error(`Error fetching show ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch multiple shows by their IDs
 * Returns a map of show_id -> Show data
 * Note: The API doesn't have a bulk endpoint, so we need to fetch shows individually
 */
export async function fetchShowsByIds(
  showIds: string[]
): Promise<Map<string, Show>> {
  const showsMap = new Map<string, Show>();

  // Fetch all shows from the API (we'll need to get all and filter by ID)
  // Since the API doesn't support filtering by ID directly, we'll fetch a large batch
  try {
    const response = await fetch(`${API_BASE_URL}?take=1000`);
    if (!response.ok) {
      console.error('Failed to fetch shows');
      return showsMap;
    }
    const data = await response.json();

    // Transform and filter shows by the IDs we want
    const shows = data.shows || [];
    shows.forEach((apiShow: any) => {
      const showId = apiShow.sys?.id || apiShow.id;
      if (showIds.includes(showId)) {
        const transformedShow: Show = {
          id: showId,
          title: apiShow.title,
          date: apiShow.date,
          slug: apiShow.slug,
          mixcloudLink: apiShow.mixcloudLink,
          coverImage: apiShow.coverImage?.url || apiShow.coverImage,
          genres: apiShow.genresCollection?.items?.map((g: any) => g.name) || [],
          artwork: apiShow.coverImage?.url,
          description: apiShow.description,
          relatedShows: [],
        };
        showsMap.set(showId, transformedShow);
      }
    });
  } catch (error) {
    console.error('Error fetching shows by IDs:', error);
  }

  return showsMap;
}
