import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GetGamesQueryDto } from './dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  buildGenreFilter(genres: string[]): Prisma.gamesWhereInput | undefined {
    if (!genres.length) {
      return undefined;
    }

    return {
      game_genres: {
        some: {
          genres: {
            OR: [
              { slug: { in: genres } },
              { name: { in: genres, mode: 'insensitive' } },
            ],
          },
        },
      },
    };
  }

  buildPlatformFilter(platforms: string[]): Prisma.gamesWhereInput | undefined {
    if (!platforms.length) {
      return undefined;
    }

    return {
      game_platforms: {
        some: {
          platforms: {
            OR: [
              { slug: { in: platforms } },
              { name: { in: platforms, mode: 'insensitive' } },
            ],
          },
        },
      },
    };
  }

  private sanitizeArray(values?: string[]): string[] {
    if (!values || !values.length) {
      return [];
    }
    return Array.from(
      new Set(
        values
          .map((value) => value?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value && value.length)),
      ),
    );
  }

  async findMany(query: GetGamesQueryDto) {
    const {
      q,
      includeDlc = false,
      take = 20,
      skip = 0,
      genre,
      platform,
      order = 'title',
      direction = 'asc',
    } = query;

    const genres = this.sanitizeArray(genre);
    const platforms = this.sanitizeArray(platform);
    const sortDirection: Prisma.SortOrder = direction === 'desc' ? 'desc' : 'asc';

    const filters: Prisma.gamesWhereInput[] = [];

    if (q) {
      filters.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (!includeDlc) {
      filters.push({ type: 'base' });
    }

    const genreFilter = this.buildGenreFilter(genres);
    if (genreFilter) {
      filters.push(genreFilter);
    }

    const platformFilter = this.buildPlatformFilter(platforms);
    if (platformFilter) {
      filters.push(platformFilter);
    }

    const where: Prisma.gamesWhereInput = filters.length ? { AND: filters } : {};

    const orderBy: Prisma.gamesOrderByWithRelationInput[] = [];

    if (order === 'rating') {
      orderBy.push({ game_stats: { rating_avg: sortDirection } });
      orderBy.push({ title: 'asc' });
    } else if (order === 'release') {
      orderBy.push({ release_date: sortDirection });
      orderBy.push({ title: 'asc' });
    } else {
      orderBy.push({ title: sortDirection });
    }

    return this.prisma.games.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        game_stats: true,
        game_genres: {
          include: { genres: true },
        },
        game_platforms: {
          include: { platforms: true },
        },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.games.findUnique({
      where: { slug },
      include: {
        game_stats: true,
        game_genres: { include: { genres: true } },
        game_platforms: { include: { platforms: true } },
      },
    });
  }

  findDlcsOf(slug: string) {
    return this.prisma.games
      .findFirst({ where: { slug } })
      .then((base) => (base ? this.prisma.games.findMany({ where: { parent_game_id: base.id } }) : []));
  }

  listGenres() {
    return this.prisma.genres.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  listPlatforms() {
    return this.prisma.platforms.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}



