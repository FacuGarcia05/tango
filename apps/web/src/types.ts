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

export interface UserRating {
  id: string;
  score: number;
  created_at: string;
  updated_at?: string;
  game: ListItemGame | null;
}

export interface UserRatingsResponse {
  total: number;
  page: number;
  take: number;
  items: UserRating[];
}

export interface BacklogEntry {
  id: string;
  created_at: string;
  game: ListItemGame;
}

export interface BacklogListResponse {
  count: number;
  items: BacklogEntry[];
}

export interface BacklogMutationResponse {
  inBacklog: boolean;
  count: number;
}

export interface BacklogContainsResponse {
  inBacklog: boolean;
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

export type PartyStatus = "open" | "closed" | "full" | "cancelled";

export interface PartyMemberSummary {
  id: string;
  joined_at: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
}

export interface PartySummary {
  id: string;
  game_id: string;
  host_user_id: string;
  platform?: string | null;
  timezone?: string | null;
  capacity: number;
  status: PartyStatus;
  description?: string | null;
  created_at: string;
  host: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
  members: PartyMemberSummary[];
  member_count: number;
}

export interface GameMediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  provider?: string | null;
  provider_id?: string | null;
  created_at?: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
}

export type DailyTangoMode = "word" | "memory" | "reaction";

export interface DailyTangoAttempt {
  id: string;
  attempt_number: number;
  won: boolean;
  score?: number | null;
  duration_ms?: number | null;
  payload?: unknown;
  played_at: string;
}

export interface DailyTangoWordConfig {
  hint: string;
  theme: string;
  length: number;
}

export interface DailyTangoMemoryCard {
  slug: string;
  title: string;
  image: string;
}

export interface DailyTangoMemoryConfig {
  deckId: string;
  title: string;
  cards: DailyTangoMemoryCard[];
}

export interface DailyTangoReactionConfig {
  minDelayMs: number;
  maxDelayMs: number;
}

export interface DailyTangoChallenge {
  id: string;
  mode: DailyTangoMode;
  available_on: string;
  config: DailyTangoWordConfig | DailyTangoMemoryConfig | DailyTangoReactionConfig;
  attempts: DailyTangoAttempt[];
  remaining_attempts: number;
  max_attempts: number;
  completed: boolean;
  streak: number;
  solution?: string | null;
}

export interface DailyTangoSummary {
  date: string;
  challenges: DailyTangoChallenge[];
}

export interface DailyTangoLeaderboardEntry {
  user: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
  };
  value: number;
  formatted: string;
  detail?: string | null;
}

export interface DailyTangoLeaderboard {
  mode: DailyTangoMode;
  period_days: number;
  metric: string;
  direction: "asc" | "desc";
  entries: DailyTangoLeaderboardEntry[];
}
