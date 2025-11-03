import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ActivityService } from '../../common/activity/activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRatingDto } from './dto';

interface RatingStats {
  rating_avg: number;
  rating_count: number;
}

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async upsertBySlug(userId: string, slug: string, dto: UpdateRatingDto) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const rating = await tx.ratings.upsert({
        where: { user_id_game_id: { user_id: userId, game_id: game.id } },
        update: { score: dto.value, updated_at: new Date() },
        create: { user_id: userId, game_id: game.id, score: dto.value },
      });

      const stats = await this.recomputeGameStats(tx, game.id);

      return {
        value: Number(rating.score),
        ...stats,
        ratingId: rating.id,
      };
    });

    await this.activity.recordActivity({
      actorId: userId,
      verb: 'rating:update',
      objectType: 'rating',
      objectId: result.ratingId,
      metadata: {
        game_id: game.id,
        game_slug: game.slug,
        game_title: game.title,
        score: result.value,
      },
    });

    const { ratingId, ...payload } = result;

    return payload;
  }

  async findMineBySlug(userId: string, slug: string) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const rating = await this.prisma.ratings.findUnique({
      where: { user_id_game_id: { user_id: userId, game_id: game.id } },
      select: { score: true },
    });

    return { value: rating ? Number(rating.score) : null };
  }

  private async recomputeGameStats(
    tx: Prisma.TransactionClient,
    gameId: string,
  ): Promise<RatingStats> {
    const agg = await tx.ratings.aggregate({
      where: { game_id: gameId },
      _avg: { score: true },
      _count: { _all: true },
    });

    const rating_avg = Number(agg._avg.score ?? 0);
    const rating_count = agg._count._all ?? 0;
    const payload = {
      rating_avg,
      rating_count,
      updated_at: new Date(),
    };

    await tx.game_stats.upsert({
      where: { game_id: gameId },
      update: payload,
      create: { game_id: gameId, ...payload },
    });

    return { rating_avg, rating_count };
  }
}
