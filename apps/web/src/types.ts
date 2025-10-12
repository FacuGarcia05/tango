export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  backdropUrl?: string | null;
  emailVerifiedAt?: string | null;
  provider?: string | null;
  providerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameStats {
  rating_avg: number | null;
  rating_count: number;
  review_count?: number;
}

export interface Taxonomy {
  slug: string;
  name: string;
}

export interface GameRelationSummary {
  id: string;
  slug: string;
  title: string;
  cover_url?: string | null;
  type?: "base" | "dlc";
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
  parentGame?: GameRelationSummary | null;
}

export interface GameDetail extends Game {
  otherGames?: GameRelationSummary[];
}

export interface ReviewAuthor {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface ReviewStats {
  likes_count: number;
  comments_count: number;
}

export interface Review {
  id: string;
  user_id: string;
  game_id: string;
  title?: string | null;
  body: string;
  has_spoilers: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  users?: ReviewAuthor;
  author?: ReviewAuthor;
  stats?: ReviewStats;
  likedByMe?: boolean;
  game?: GameRelationSummary | null;
}

export interface PaginatedReviews {
  total: number;
  items: Review[];
}

export interface UserSearchResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  followers: number;
  following: number;
  isFollowing?: boolean;
}

export interface UserSearchResponse {
  total: number;
  items: UserSearchResult[];
}

export interface ReviewComment {
  id: string;
  body: string;
  created_at: string;
  updated_at?: string;
  review_id: string;
  user_id: string;
  author: ReviewAuthor;
}

export interface FollowStats {
  followers: number;
  following: number;
  isFollowing?: boolean;
}

export interface ProfileSummary {
  bio: string | null;
  avatarUrl: string | null;
  backdropUrl: string | null;
  favGenres: string[];
  favPlatforms: string[];
}

export interface UserSummary {
  user: User;
  profile: ProfileSummary;
  followers: number;
  following: number;
  reviewsCount: number;
  ratingsCount: number;
  isFollowing?: boolean;
}

export interface RatingMutationResponse {
  value: number;
  rating_avg: number;
  rating_count: number;
}
