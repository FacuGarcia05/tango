import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GetGamesQueryDto } from './dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  findMany(query: GetGamesQueryDto) {
    const { q, includeDlc = false, take = 20, skip = 0, genre, platform, order = 'title', direction = 'asc' } = query;

    const where: Prisma.gamesWhereInput = {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { slug: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {},
        includeDlc ? {} : { type: 'base' },
        genre?.length
          ? {
              game_genres: {
                some: { genres: { slug: { in: genre } } },
              },
            }
          : {},
        platform?.length
          ? {
              game_platforms: {
                some: { platforms: { slug: { in: platform } } },
              },
            }
          : {},
      ],
    };

    let orderBy: Prisma.gamesOrderByWithRelationInput = { title: direction } as any;
    if (order === 'release') orderBy = { release_date: direction } as any;
    if (order === 'rating') orderBy = { game_stats: { rating_avg: direction as Prisma.SortOrder } };

    return this.prisma.games.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        game_stats: true,
      },
    });
  }
//a
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
    return this.prisma.games.findFirst({ where: { slug } }).then(base =>
      base ? this.prisma.games.findMany({ where: { parent_game_id: base.id } }) : [],
    );
  }
}
