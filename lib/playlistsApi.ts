import { Show } from '@/types/shows';

const PLAYLISTS_API = 'https://refuge-worldwide-git-playlist-api-refugeworldwide.vercel.app/api/playlists';

export interface ApiPlaylist {
  id: string;
  title: string;
  slug: string;
  description?: {
    json?: {
      content?: Array<{
        content?: Array<{ value?: string; nodeType?: string }>;
        nodeType?: string;
      }>;
    };
  };
  soundcloudLink?: string;
  image?: string;
}

export interface ApiPlaylistWithShows extends ApiPlaylist {
  shows: Show[];
}

export function getPlaylistDescriptionText(description: ApiPlaylist['description']): string {
  try {
    for (const block of description?.json?.content || []) {
      for (const inline of block.content || []) {
        if (inline.nodeType === 'text' && inline.value?.trim()) {
          return inline.value.trim();
        }
      }
    }
  } catch {}
  return '';
}

export async function fetchPlaylists(): Promise<ApiPlaylist[]> {
  const res = await fetch(PLAYLISTS_API);
  if (!res.ok) throw new Error('Failed to fetch playlists');
  return res.json();
}

export async function fetchPlaylistBySlug(slug: string): Promise<ApiPlaylistWithShows> {
  const res = await fetch(`${PLAYLISTS_API}/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch playlist');
  return res.json();
}
