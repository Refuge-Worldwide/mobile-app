export interface Artist {
  id: string;
  name: string;
  slug: string;
}

export interface Show {
  id: string;
  title: string;
  date: string; // ISO timestamp
  slug: string;
  mixcloudLink?: string;
  audioFile?: string;
  coverImage?: string;
  genres: string[];
  artwork?: string;
  description?: string;
  relatedShows?: Show[];
  artists?: Artist[];
}

export interface ShowsApiResponse {
  shows: Show[];
  total?: number;
}
