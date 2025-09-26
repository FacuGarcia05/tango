import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertRatingDto } from './dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async upsert(userId: string, dto: UpsertRatingDto) {
    // Validate game exists
    const game = await this.prisma.games.findUnique({ where: { id: dto.gameId }, select: { id: true } });
    if (!game) throw new NotFoundException('Juego no encontrado');

    const rating = await this.prisma.ratings.upsert({
      where: { user_id_game_id: { user_id: userId, game_id: dto.gameId } },
      update: { score: dto.score },
      create: { user_id: userId, game_id: dto.gameId, score: dto.score },
    });

    await this.recomputeGameStats(dto.gameId);
    return rating;
  }

  private async recomputeGameStats(gameId: string) {
    const agg = await this.prisma.ratings.aggregate({
      where: { game_id: gameId },
      _avg: { score: true },
      _count: { _all: true },
    });

    const rating_avg = Number(agg._avg.score ?? 0);
    const rating_count = agg._count._all ?? 0;

    await this.prisma.game_stats.upsert({
      where: { game_id: gameId },
      update: { rating_avg, rating_count },
      create: { game_id: gameId, rating_avg, rating_count },
    });
  }
}

