import { Show } from './shows';

export interface Artist {
  id: string;
  name: string;
  slug: string;
  photo?: string;
  coverImage?: string;
  bio?: string;
  shows?: Show[];
}

export interface ArtistApiResponse {
  artist: Artist;
  shows?: Show[];
}
