export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameStats {
  rating_avg: number | null;
  rating_count: number;
}

export interface Taxonomy {
  slug: string;
  name: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  type: "base" | "dlc";
  release_date?: string | null;
  est_length_hours?: number | null;
  genres?: Taxonomy[];
  platforms?: Taxonomy[];
  game_stats?: GameStats | null;
  description?: string | null;
  cover_url?: string | null;
}
