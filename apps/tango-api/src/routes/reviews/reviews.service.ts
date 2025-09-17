import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const exists = await this.prisma.reviews.findFirst({
      where: { user_id: userId, game_id: dto.gameId, is_deleted: false },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Ya existe una reseña para este juego');

    return this.prisma.reviews.create({
      data: {
        user_id: userId,
        game_id: dto.gameId,
        title: dto.title ?? null,
        body: dto.body,
        has_spoilers: dto.hasSpoilers,
      },
    });
  }

  async listByGameSlug(slug: string, take: number, skip: number) {
    const game = await this.prisma.games.findUnique({ where: { slug }, select: { id: true } });
    if (!game) throw new NotFoundException('Juego no encontrado');

    return this.prisma.reviews.findMany({
      where: { game_id: game.id, is_deleted: false },
      orderBy: { created_at: 'desc' },
      take,
      skip,
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
        _count: { select: { review_likes: true, comments: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review || review.is_deleted) throw new NotFoundException('Reseña no encontrada');
    if (review.user_id !== userId) throw new ForbiddenException('No autorizado');

    return this.prisma.reviews.update({
      where: { id },
      data: {
        title: dto.title ?? review.title,
        body: dto.body ?? review.body,
        has_spoilers: dto.hasSpoilers ?? review.has_spoilers,
      },
    });
  }

  async softDelete(userId: string, id: string) {
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review || review.is_deleted) throw new NotFoundException('Reseña no encontrada');
    if (review.user_id !== userId) throw new ForbiddenException('No autorizado');

    await this.prisma.reviews.update({ where: { id }, data: { is_deleted: true } });
    return { success: true };
  }

  async like(userId: string, reviewId: string) {
    const review = await this.prisma.reviews.findUnique({ where: { id: reviewId }, select: { id: true, is_deleted: true } });
    if (!review || review.is_deleted) throw new NotFoundException('Reseña no encontrada');

    const exists = await this.prisma.review_likes.findUnique({
      where: { user_id_review_id: { user_id: userId, review_id: reviewId } },
    }).catch(() => null);

    if (!exists) {
      await this.prisma.review_likes.create({ data: { user_id: userId, review_id: reviewId } });
    }
    return { liked: true };
  }

  async unlike(userId: string, reviewId: string) {
    const existing = await this.prisma.review_likes.findUnique({
      where: { user_id_review_id: { user_id: userId, review_id: reviewId } },
    }).catch(() => null);
    if (existing) {
      await this.prisma.review_likes.delete({ where: { user_id_review_id: { user_id: userId, review_id: reviewId } } });
    }
    return { liked: false };
  }
}

