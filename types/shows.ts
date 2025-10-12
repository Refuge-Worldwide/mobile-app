export interface Show {
  id: string;
  title: string;
  date: string; // ISO timestamp
  slug: string;
  mixcloudLink?: string;
  coverImage?: string;
  genres: string[];
  artwork?: string;
  description?: string;
  relatedShows?: Show[];
}

export interface ShowsApiResponse {
  shows: Show[];
  total?: number;
}
