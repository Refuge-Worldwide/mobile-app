export interface Show {
  id: string;
  title: string;
  date: string; // ISO timestamp
  slug: string;
  mixcloudLink?: string;
  coverImage?: string;
  genres: string[];
  artwork?: string;
}

export interface ShowsApiResponse {
  shows: Show[];
  total?: number;
}
