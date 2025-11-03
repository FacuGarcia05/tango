import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { game_type, media_type, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface RawgSearchResult {
  id: number;
  slug: string;
  name: string;
  background_image?: string | null;
  released?: string | null;
}

interface RawgGameDetails extends RawgSearchResult {
  description_raw?: string | null;
  playtime?: number | null;
  rating?: number | null;
  platforms?: Array<{
    platform: {
      id: number;
      slug: string;
      name: string;
    };
  }>;
  genres?: Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  short_screenshots?: Array<{ id: number; image: string }>;
}

interface RawgPagedResponse<T> {
  results: T[];
}

export interface ImportResult {
  gameId: string;
  slug: string;
  title: string;
  genresLinked: number;
  platformsLinked: number;
  screenshotsAdded: number;
  dlcsAdded: number;
}

@Injectable()
export class RawgService {
  private readonly logger = new Logger(RawgService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly userAgent: string;
  private readonly pageSize: number;
  private readonly delayMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const baseUrl =
      this.config.get<string>('RAWG_BASE') ?? 'https://api.rawg.io/api';
    this.apiKey = this.config.get<string>('RAWG_KEY') ?? '';
    this.userAgent = this.config.get<string>('RAWG_USER_AGENT') ?? 'TANGO/1.0';
    this.pageSize = Number(this.config.get<string>('RAWG_PAGE_SIZE') ?? 40);
    this.delayMs = Number(
      this.config.get<string>('RAWG_IMPORT_DELAY_MS') ?? 300,
    );

    this.client = axios.create({
      baseURL: baseUrl,
    });

    this.client.interceptors.request.use((config) => {
      config.params = { ...(config.params || {}), key: this.apiKey };
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('User-Agent', this.userAgent);
      } else {
        const headers = {
          ...(config.headers as Record<string, string> | undefined),
        };
        headers['User-Agent'] = this.userAgent;
        config.headers = AxiosHeaders.from(headers);
      }
      return config;
    });
  }

  async searchOneBySlugOrName(query: string): Promise<RawgSearchResult | null> {
    if (!query?.trim()) {
      return null;
    }

    const exact = await this.fetchSearch(query, true);
    if (exact?.results?.length) {
      return exact.results[0];
    }

    const fallback = await this.fetchSearch(query, false);
    if (fallback?.results?.length) {
      return fallback.results[0];
    }
    return null;
  }

  async getDetails(id: number): Promise<RawgGameDetails> {
    const response = await this.client.get<RawgGameDetails>(`/games/${id}`);
    return response.data;
  }

  async getScreenshots(id: number) {
    const response = await this.client.get<
      RawgPagedResponse<{ id: number; image: string }>
    >(`/games/${id}/screenshots`, { params: { page_size: this.pageSize } });
    return response.data.results ?? [];
  }

  async getAdditions(id: number) {
    const response = await this.client.get<RawgPagedResponse<RawgGameDetails>>(
      `/games/${id}/additions`,
      {
        params: { page_size: this.pageSize },
      },
    );
    return response.data.results ?? [];
  }

  async importBySlug(slugOrName: string): Promise<ImportResult> {
    const match = await this.searchOneBySlugOrName(slugOrName);
    if (!match) {
      throw new NotFoundException(
        `No encontramos el juego ${slugOrName} en RAWG`,
      );
    }

    const rawgId = match.id;
    const [details, screenshots, additions] = await Promise.all([
      this.getDetails(rawgId),
      this.getScreenshots(rawgId),
      this.getAdditions(rawgId),
    ]);

    const baseGame = await this.upsertGame(details, null);
    const genreSlugs = await this.syncGenres(baseGame.id, details.genres ?? []);
    const platformSlugs = await this.syncPlatforms(
      baseGame.id,
      details.platforms ?? [],
    );
    const screenshotsAdded = await this.addScreenshots(
      baseGame.id,
      screenshots,
      details.short_screenshots ?? [],
    );

    const dlcResults: string[] = [];
    for (const addition of additions) {
      const dlc = await this.upsertGame(addition, baseGame.id);
      await this.syncGenres(dlc.id, addition.genres ?? []);
      await this.syncPlatforms(dlc.id, addition.platforms ?? []);
      await this.ensureStats(dlc.id);
      dlcResults.push(dlc.id);
    }

    await this.ensureStats(baseGame.id);
    await this.prisma.game_stats.update({
      where: { game_id: baseGame.id },
      data: {
        updated_at: new Date(),
        dlc_count: dlcResults.length,
        media_count: await this.prisma.game_media.count({
          where: { game_id: baseGame.id },
        }),
      },
    });

    return {
      gameId: baseGame.id,
      slug: baseGame.slug,
      title: baseGame.title,
      genresLinked: genreSlugs.length,
      platformsLinked: platformSlugs.length,
      screenshotsAdded,
      dlcsAdded: dlcResults.length,
    };
  }

  async importBulk(slugs: string[]) {
    const results: Array<{ slug: string; success: boolean; error?: string }> =
      [];
    for (const raw of slugs) {
      const slug = raw?.trim();
      if (!slug) continue;
      try {
        await this.importBySlug(slug);
        results.push({ slug, success: true });
      } catch (error: any) {
        const message = error?.message ?? 'Import failed';
        this.logger.error(`RAWG import failed for ${slug}: ${message}`);
        results.push({ slug, success: false, error: message });
      }
      await this.delay(this.delayMs);
    }
    return {
      total: results.length,
      imported: results.filter((r) => r.success).length,
      errors: results.filter((r) => !r.success),
    };
  }

  async listGames(page: number) {
    const response = await this.client.get<RawgPagedResponse<RawgSearchResult>>(
      '/games',
      {
        params: {
          page,
          page_size: this.pageSize,
        },
      },
    );
    return response.data.results ?? [];
  }

  async importTopGames(pages: number) {
    const safePages = Math.max(1, Math.min(pages, 25));
    const seen = new Set<string>();

    for (let page = 1; page <= safePages; page += 1) {
      const entries = await this.listGames(page);
      entries.forEach((entry) => {
        if (entry?.slug) {
          seen.add(entry.slug);
        }
      });
      await this.delay(100);
    }

    const slugs = Array.from(seen);
    if (!slugs.length) {
      return {
        total: 0,
        imported: 0,
        errors: [] as Array<{ slug: string; success: false; error?: string }>,
      };
    }
    return this.importBulk(slugs);
  }

  private async fetchSearch(query: string, exact: boolean) {
    const params: Record<string, string | number | boolean> = {
      search: query,
      page_size: 1,
      search_exact: exact,
    };
    if (!exact) {
      params.search_precise = false;
    }
    const response = await this.client.get<RawgPagedResponse<RawgSearchResult>>(
      '/games',
      { params },
    );
    return response.data;
  }

  private async upsertGame(details: RawgGameDetails, parentId: string | null) {
    const cover =
      details.background_image ?? details.short_screenshots?.[0]?.image ?? null;
    const releaseDate = details.released ? new Date(details.released) : null;
    const estimatedHours =
      typeof details.playtime === 'number' && Number.isFinite(details.playtime)
        ? Math.round(details.playtime)
        : null;

    const data: Prisma.gamesUncheckedCreateInput = {
      slug: details.slug,
      title: details.name,
      description: details.description_raw ?? null,
      cover_url: cover,
      release_date: releaseDate,
      est_length_hours: estimatedHours,
      type: parentId ? game_type.dlc : game_type.base,
      parent_game_id: parentId ?? undefined,
    };

    const result = await this.prisma.games.upsert({
      where: { slug: details.slug },
      update: {
        title: data.title,
        description: data.description,
        cover_url: data.cover_url,
        release_date: data.release_date,
        est_length_hours: data.est_length_hours,
        parent_game_id: data.parent_game_id,
        type: data.type,
        updated_at: new Date(),
      },
      create: data,
    });

    return result;
  }

  private async syncGenres(gameId: string, genres: RawgGameDetails['genres']) {
    if (!genres?.length) return [];

    const ensured = await Promise.all(
      genres.map((genre) => this.ensureGenre(genre.slug, genre.name)),
    );
    await this.prisma.game_genres.createMany({
      data: ensured.map((genre) => ({ game_id: gameId, genre_id: genre.id })),
      skipDuplicates: true,
    });
    return ensured.map((genre) => genre.slug);
  }

  private async syncPlatforms(
    gameId: string,
    platforms: RawgGameDetails['platforms'],
  ) {
    if (!platforms?.length) return [];

    const ensured = await Promise.all(
      platforms
        .map((entry) => entry.platform)
        .filter((platform): platform is NonNullable<typeof platform> =>
          Boolean(platform?.slug),
        )
        .map((platform) => this.ensurePlatform(platform.slug, platform.name)),
    );

    await this.prisma.game_platforms.createMany({
      data: ensured.map((platform) => ({
        game_id: gameId,
        platform_id: platform.id,
      })),
      skipDuplicates: true,
    });
    return ensured.map((platform) => platform.slug);
  }

  private async ensureGenre(slug: string, name: string) {
    const existingBySlug = await this.prisma.genres.findUnique({
      where: { slug },
    });
    if (existingBySlug) {
      if (existingBySlug.name !== name) {
        return this.prisma.genres.update({ where: { slug }, data: { name } });
      }
      return existingBySlug;
    }

    const existingByName = await this.prisma.genres.findUnique({
      where: { name },
    });
    if (existingByName) {
      if (existingByName.slug !== slug) {
        return this.prisma.genres.update({ where: { name }, data: { slug } });
      }
      return existingByName;
    }

    return this.prisma.genres.create({ data: { slug, name } });
  }

  private async ensurePlatform(slug: string, name: string) {
    const existingBySlug = await this.prisma.platforms.findUnique({
      where: { slug },
    });
    if (existingBySlug) {
      if (existingBySlug.name !== name) {
        return this.prisma.platforms.update({
          where: { slug },
          data: { name },
        });
      }
      return existingBySlug;
    }

    const existingByName = await this.prisma.platforms.findUnique({
      where: { name },
    });
    if (existingByName) {
      if (existingByName.slug !== slug) {
        return this.prisma.platforms.update({
          where: { name },
          data: { slug },
        });
      }
      return existingByName;
    }

    return this.prisma.platforms.create({ data: { slug, name } });
  }

  private async ensureStats(gameId: string) {
    return this.prisma.game_stats.upsert({
      where: { game_id: gameId },
      update: { updated_at: new Date() },
      create: {
        game_id: gameId,
        rating_avg: 0,
        rating_count: 0,
        review_count: 0,
        dlc_count: 0,
        media_count: 0,
      },
    });
  }

  private async addScreenshots(
    gameId: string,
    screenshots: Array<{ image: string }>,
    fallback: Array<{ image: string }>,
  ) {
    const inputs = [...(screenshots ?? []), ...(fallback ?? [])]
      .map((shot) => shot?.image)
      .filter((url): url is string => Boolean(url));

    if (!inputs.length) return 0;

    const createPayload = inputs.map((url) => ({
      game_id: gameId,
      type: media_type.image,
      provider: 'rawg',
      provider_id: this.hash(url),
      url,
    }));

    let created = 0;
    for (const payload of createPayload) {
      try {
        await this.prisma.game_media.upsert({
          where: {
            provider_provider_id: {
              provider: payload.provider,
              provider_id: payload.provider_id ?? undefined,
            },
          },
          update: {},
          create: payload,
        });
        created += 1;
      } catch (error) {
        this.logger.debug(
          `Screenshot already exists for ${gameId}: ${payload.url}`,
        );
      }
    }
    return created;
  }

  private hash(value: string) {
    return createHash('sha1').update(value).digest('hex');
  }

  private async delay(ms: number) {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
