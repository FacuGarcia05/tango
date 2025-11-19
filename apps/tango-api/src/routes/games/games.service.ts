import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, game_type } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { GetGamesQueryDto } from './dto';

type GameWithRelations = Prisma.gamesGetPayload<{
  include: {
    game_stats: true;
    game_genres: { include: { genres: true } };
    game_platforms: { include: { platforms: true } };
    games: { select: { id: true; slug: true; title: true } };
  };
}>;

type GameMediaPayload = Prisma.game_mediaGetPayload<{
  include: {
    users: { select: { id: true; display_name: true; avatar_url: true } };
  };
}>;

interface SimplifiedGame
  extends Omit<GameWithRelations, 'game_genres' | 'game_platforms' | 'games'> {
  genres: Array<{ slug: string; name: string }>;
  platforms: Array<{ slug: string; name: string }>;
  parentGame?: { id: string; slug: string; title: string } | null;
}

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  private readonly mapGame = (game: GameWithRelations): SimplifiedGame => {
    const { game_genres, game_platforms, games: parent, ...rest } = game;

    const genres = game_genres.map(({ genres }) => ({
      slug: genres.slug,
      name: genres.name,
    }));
    const platforms = game_platforms.map(({ platforms }) => ({
      slug: platforms.slug,
      name: platforms.name,
    }));

    return {
      ...rest,
      genres,
      platforms,
      parentGame: parent ?? null,
    };
  };

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

  private buildGenreFilter(
    genres: string[],
  ): Prisma.gamesWhereInput | undefined {
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

  private buildPlatformFilter(
    platforms: string[],
  ): Prisma.gamesWhereInput | undefined {
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
    const sortDirection: Prisma.SortOrder =
      direction === 'desc' ? 'desc' : 'asc';

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
      filters.push({ type: game_type.base });
    }

    const genreFilter = this.buildGenreFilter(genres);
    if (genreFilter) filters.push(genreFilter);

    const platformFilter = this.buildPlatformFilter(platforms);
    if (platformFilter) filters.push(platformFilter);

    const where: Prisma.gamesWhereInput = filters.length
      ? { AND: filters }
      : {};

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

    const [total, games] = await this.prisma.$transaction([
      this.prisma.games.count({ where }),
      this.prisma.games.findMany({
        where,
        orderBy,
        take,
        skip,
        include: {
          game_stats: true,
          game_genres: { include: { genres: true } },
          game_platforms: { include: { platforms: true } },
          games: { select: { id: true, slug: true, title: true } },
        },
      }),
    ]);

    return {
      total,
      items: games.map(this.mapGame),
    };
  }

  async findBySlug(slug: string) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      include: {
        game_stats: true,
        game_genres: { include: { genres: true } },
        game_platforms: { include: { platforms: true } },
        games: { select: { id: true, slug: true, title: true } },
        other_games: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            cover_url: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const mapped = this.mapGame(game);
    return {
      ...mapped,
      other_games: game.other_games ?? [],
    };
  }

  async findDlcsOf(slug: string) {
    const base = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!base) {
      throw new NotFoundException('Juego no encontrado');
    }

    const dlcs = await this.prisma.games.findMany({
      where: { parent_game_id: base.id },
      orderBy: { title: 'asc' },
      include: {
        game_stats: true,
        game_genres: { include: { genres: true } },
        game_platforms: { include: { platforms: true } },
        games: { select: { id: true, slug: true, title: true } },
      },
    });

    return dlcs.map(this.mapGame);
  }

  async setCoverBySlug(slug: string, url: string) {
    const normalized = url?.trim();
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
      throw new BadRequestException('URL de portada invalida');
    }

    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { slug: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    return this.prisma.games.update({
      where: { slug },
      data: { cover_url: normalized },
      select: { slug: true, cover_url: true },
    });
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

  async listMediaBySlug(slug: string) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const items = await this.prisma.game_media.findMany({
      where: { game_id: game.id, is_hidden: false },
      orderBy: { created_at: 'desc' },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    return items.map((item: GameMediaPayload) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      provider: item.provider,
      provider_id: item.provider_id,
      created_at: item.created_at,
      user: item.users
        ? {
            id: item.users.id,
            display_name: item.users.display_name,
            avatar_url: item.users.avatar_url ?? null,
          }
        : null,
    }));
  }
}
