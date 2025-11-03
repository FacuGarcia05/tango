import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ActivityService } from '../../common/activity/activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCommentDto,
  CreateReviewDto,
  UpdateCommentDto,
  UpdateReviewDto,
} from './dto';

type ReviewWithAuthor = Prisma.reviewsGetPayload<{
  include: {
    users: { select: { id: true; display_name: true; avatar_url: true } };
    games: { select: { id: true; slug: true; title: true; cover_url: true } };
  };
}>;

type CommentWithAuthor = Prisma.commentsGetPayload<{
  include: {
    users: { select: { id: true; display_name: true; avatar_url: true } };
  };
}>;

interface ReviewStatsMap {
  [reviewId: string]: {
    likes: number;
    comments: number;
  };
}

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const game = await this.prisma.games.findUnique({
      where: { id: dto.gameId },
      select: { id: true, slug: true, title: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.reviews.findFirst({
        where: { user_id: userId, game_id: dto.gameId, is_deleted: false },
        select: { id: true },
      });
      if (exists) {
        throw new BadRequestException('Ya existe una resena para este juego');
      }

      const review = await tx.reviews.create({
        data: {
          user_id: userId,
          game_id: dto.gameId,
          title: dto.title ?? null,
          body: dto.body,
          has_spoilers: dto.hasSpoilers ?? false,
        },
      });

      await this.recomputeGameReviewStats(tx, dto.gameId);

      return review;
    });

    await this.activity.recordActivity({
      actorId: userId,
      verb: 'review:create',
      objectType: 'review',
      objectId: review.id,
      metadata: {
        game_id: game.id,
        game_slug: game.slug,
        game_title: game.title,
        review_title: review.title,
      },
    });

    return review;
  }

  async listByGameSlug(
    slug: string,
    take: number,
    skip: number,
    viewerId?: string,
  ) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const baseWhere = { game_id: game.id, is_deleted: false } as const;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.reviews.count({ where: baseWhere }),
      this.prisma.reviews.findMany({
        where: baseWhere,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          users: { select: { id: true, display_name: true, avatar_url: true } },
          games: {
            select: { id: true, slug: true, title: true, cover_url: true },
          },
        },
      }),
    ]);

    const mapped = await this.attachStats(items, viewerId);

    return { total, items: mapped };
  }

  async listByUser(
    userId: string,
    take: number,
    skip: number,
    viewerId?: string,
  ) {
    const baseWhere = { user_id: userId, is_deleted: false } as const;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.reviews.count({ where: baseWhere }),
      this.prisma.reviews.findMany({
        where: baseWhere,
        orderBy: { created_at: 'desc' },
        take,
        skip,
        include: {
          users: { select: { id: true, display_name: true, avatar_url: true } },
          games: {
            select: { id: true, slug: true, title: true, cover_url: true },
          },
        },
      }),
    ]);

    const mapped = await this.attachStats(items, viewerId);

    return { total, items: mapped };
  }

  async userHasReview(userId: string, gameId: string) {
    const review = await this.prisma.reviews.findFirst({
      where: { user_id: userId, game_id: gameId, is_deleted: false },
      select: { id: true },
    });

    return review
      ? { hasReview: true, reviewId: review.id }
      : { hasReview: false };
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review || review.is_deleted) {
      throw new NotFoundException('Resena no encontrada');
    }
    if (review.user_id !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reviews.update({
        where: { id },
        data: {
          title: dto.title ?? review.title,
          body: dto.body ?? review.body,
          has_spoilers: dto.hasSpoilers ?? review.has_spoilers,
        },
      });

      await this.recomputeGameReviewStats(tx, review.game_id);

      return updated;
    });
  }

  async softDelete(userId: string, id: string) {
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review || review.is_deleted) {
      throw new NotFoundException('Resena no encontrada');
    }
    if (review.user_id !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reviews.update({
        where: { id },
        data: { is_deleted: true, updated_at: new Date() },
      });
      await this.recomputeGameReviewStats(tx, review.game_id);
    });

    return { success: true };
  }

  async toggleLike(userId: string, reviewId: string) {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.findUnique({
        where: { id: reviewId },
        select: { id: true, is_deleted: true },
      });
      if (!review || review.is_deleted) {
        throw new NotFoundException('Resena no encontrada');
      }

      const existing = await tx.review_likes.findUnique({
        where: { user_id_review_id: { user_id: userId, review_id: reviewId } },
        select: { user_id: true },
      });

      let liked: boolean;

      if (existing) {
        await tx.review_likes.delete({
          where: {
            user_id_review_id: { user_id: userId, review_id: reviewId },
          },
        });
        liked = false;
      } else {
        await tx.review_likes.create({
          data: { user_id: userId, review_id: reviewId },
        });
        liked = true;
      }

      const likes_count = await tx.review_likes.count({
        where: { review_id: reviewId },
      });

      return { liked, likes_count };
    });
  }

  async listComments(reviewId: string) {
    await this.ensureReviewVisible(reviewId);

    const comments = await this.prisma.comments.findMany({
      where: { review_id: reviewId, is_deleted: false },
      orderBy: { created_at: 'asc' },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    return comments.map((comment) => this.presentComment(comment));
  }

  async createComment(userId: string, reviewId: string, dto: CreateCommentDto) {
    await this.ensureReviewVisible(reviewId);

    const body = this.sanitizeComment(dto.body);

    const comment = await this.prisma.comments.create({
      data: {
        review_id: reviewId,
        user_id: userId,
        body,
      },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    return this.presentComment(comment);
  }

  async updateComment(
    userId: string,
    reviewId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true, review_id: true, is_deleted: true },
    });

    if (!comment || comment.review_id !== reviewId || comment.is_deleted) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    const body = this.sanitizeComment(dto.body);

    const updated = await this.prisma.comments.update({
      where: { id: commentId },
      data: { body, updated_at: new Date() },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
      },
    });

    return this.presentComment(updated);
  }

  async deleteComment(userId: string, reviewId: string, commentId: string) {
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
      select: { id: true, user_id: true, review_id: true, is_deleted: true },
    });

    if (!comment || comment.review_id !== reviewId || comment.is_deleted) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('No autorizado');
    }

    await this.prisma.comments.update({
      where: { id: commentId },
      data: { is_deleted: true, updated_at: new Date() },
    });

    return { success: true };
  }

  private async attachStats(reviews: ReviewWithAuthor[], viewerId?: string) {
    if (!reviews.length) {
      return [];
    }

    const ids = reviews.map((review) => review.id);
    const stats = await this.buildStatsMap(ids);
    const liked = await this.buildLikedMap(ids, viewerId);

    return reviews.map((review) => this.presentReview(review, stats, liked));
  }

  private async buildStatsMap(ids: string[]): Promise<ReviewStatsMap> {
    if (!ids.length) {
      return {};
    }

    const [likes, comments] = await Promise.all([
      this.prisma.review_likes.groupBy({
        by: ['review_id'],
        where: { review_id: { in: ids } },
        _count: { review_id: true },
      }),
      this.prisma.comments.groupBy({
        by: ['review_id'],
        where: { review_id: { in: ids }, is_deleted: false },
        _count: { review_id: true },
      }),
    ]);

    const stats: ReviewStatsMap = {};

    likes.forEach((entry) => {
      stats[entry.review_id] = {
        ...(stats[entry.review_id] ?? { likes: 0, comments: 0 }),
        likes: entry._count.review_id,
      };
    });

    comments.forEach((entry) => {
      stats[entry.review_id] = {
        ...(stats[entry.review_id] ?? { likes: 0, comments: 0 }),
        comments: entry._count.review_id,
      };
    });

    ids.forEach((id) => {
      if (!stats[id]) {
        stats[id] = { likes: 0, comments: 0 };
      }
    });

    return stats;
  }

  private async buildLikedMap(ids: string[], viewerId?: string) {
    if (!viewerId || !ids.length) {
      return new Set<string>();
    }

    const likes = await this.prisma.review_likes.findMany({
      where: { review_id: { in: ids }, user_id: viewerId },
      select: { review_id: true },
    });

    return new Set(likes.map((entry) => entry.review_id));
  }

  private presentReview(
    review: ReviewWithAuthor,
    stats: ReviewStatsMap,
    liked: Set<string>,
  ) {
    return {
      id: review.id,
      user_id: review.user_id,
      game_id: review.game_id,
      title: review.title,
      body: review.body,
      has_spoilers: review.has_spoilers,
      is_deleted: review.is_deleted,
      created_at: review.created_at,
      updated_at: review.updated_at,
      author: {
        id: review.users.id,
        display_name: review.users.display_name,
        avatar_url: review.users.avatar_url,
      },
      stats: {
        likes_count: stats[review.id]?.likes ?? 0,
        comments_count: stats[review.id]?.comments ?? 0,
      },
      likedByMe: liked.has(review.id),
      game: review.games
        ? {
            id: review.games.id,
            slug: review.games.slug,
            title: review.games.title,
            cover_url: review.games.cover_url,
          }
        : undefined,
    };
  }

  private presentComment(comment: CommentWithAuthor) {
    return {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user_id: comment.user_id,
      review_id: comment.review_id,
      author: {
        id: comment.users.id,
        display_name: comment.users.display_name,
        avatar_url: comment.users.avatar_url,
      },
    };
  }

  private sanitizeComment(body: string) {
    const trimmed = body?.trim() ?? '';
    if (!trimmed.length) {
      throw new BadRequestException('El comentario no puede estar vacio');
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException(
        'El comentario no puede exceder los 2000 caracteres',
      );
    }
    return trimmed;
  }

  private async recomputeGameReviewStats(
    tx: Prisma.TransactionClient,
    gameId: string,
  ) {
    const review_count = await tx.reviews.count({
      where: { game_id: gameId, is_deleted: false },
    });

    const payload = { review_count, updated_at: new Date() };

    await tx.game_stats.upsert({
      where: { game_id: gameId },
      update: payload,
      create: { game_id: gameId, ...payload },
    });
  }

  private async ensureReviewVisible(reviewId: string) {
    const review = await this.prisma.reviews.findUnique({
      where: { id: reviewId },
      select: { id: true, is_deleted: true },
    });

    if (!review || review.is_deleted) {
      throw new NotFoundException('Resena no encontrada');
    }
  }
}
