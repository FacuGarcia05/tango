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

export interface ListItemGame {
  id: string;
  slug: string;
  title: string;
  cover_url?: string | null;
}

export interface ListItem {
  id: string;
  position: number;
  note?: string | null;
  created_at?: string;
  game: ListItemGame;
}

export interface ListOwner {
  id: string;
  display_name: string;
}

export interface ListSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  is_public: boolean;
  is_backlog: boolean;
  created_at?: string;
  updated_at?: string;
  items_count: number;
  items_preview?: ListItem[];
}

export interface ListDetail extends ListSummary {
  owner: ListOwner;
  items: ListItem[];
}

export interface ListPaginatedResponse {
  total: number;
  page: number;
  take: number;
  items: ListSummary[];
}

export interface ToggleBacklogResponse {
  inBacklog: boolean;
  count: number;
}

export type FeedVerb =
  | "follow"
  | "review:create"
  | "rating:update"
  | "list:create"
  | "list:add"
  | "list:reorder"
  | "list:publish";

export interface FeedActor {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface FeedActivityPayload {
  list?: ListSummary & { is_public: boolean; is_backlog: boolean };
  game?: ListItemGame;
  review?: {
    id: string;
    title?: string | null;
    has_spoilers: boolean;
    excerpt: string;
  };
  rating?: { id: string; score: number | string };
  target?: FeedActor;
  metadata?: Record<string, unknown>;
}

export interface FeedActivity {
  id: string;
  verb: FeedVerb;
  created_at: string;
  actor: FeedActor;
  object_type?: string | null;
  object_id?: string | null;
  metadata?: Record<string, unknown>;
  payload?: FeedActivityPayload;
}

export interface FeedResponse {
  total: number;
  page: number;
  take: number;
  items: FeedActivity[];
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  source: string;
  excerpt: string;
  cover_url?: string | null;
  published_at: string;
  source_url?: string;
  is_featured?: boolean;
}

export interface NewsPaginatedResponse {
  total: number;
  page: number;
  take: number;
  items: NewsItem[];
}
