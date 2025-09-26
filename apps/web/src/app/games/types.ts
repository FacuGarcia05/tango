export type DurationFilter = "short" | "medium" | "long" | "";

export interface GamesFilters {
  q: string;
  genres: string[];
  platforms: string[];
  duration: DurationFilter;
  includeDlc: boolean;
  order: "title" | "release" | "rating";
  direction: "asc" | "desc";
  page: number;
  take: number;
}
