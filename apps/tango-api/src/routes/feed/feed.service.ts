import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

type ActivityWithRelations = Prisma.activitiesGetPayload<{
  include: {
    actor: { select: { id: true; display_name: true; avatar_url: true } };
    target_user: { select: { id: true; display_name: true; avatar_url: true } };
  };
}>;

type ListSummary = Prisma.listsGetPayload<{
  select: { id: true; slug: true; title: true; is_public: true; is_backlog: true };
}>;

type ReviewSummary = Prisma.reviewsGetPayload<{
  select: {
    id: true;
    title: true;
    has_spoilers: true;
    body: true;
    games: { select: { id: true; slug: true; title: true; cover_url: true } };
  };
}>;

type RatingSummary = Prisma.ratingsGetPayload<{
  select: {
    id: true;
    score: true;
    games: { select: { id: true; slug: true; title: true; cover_url: true } };
  };
}>;

type GameSummary = Prisma.gamesGetPayload<{
  select: { id: true; slug: true; title: true; cover_url: true };
}>;

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  private clampPagination(page?: number, take?: number) {
    const limit = Math.min(Math.max(take ?? 20, 1), 50);
    const safePage = Math.max(page ?? 1, 1);
    const skip = (safePage - 1) * limit;

    return { limit, safePage, skip };
  }

  private async hydrateActivities(activities: ActivityWithRelations[]) {
    const listIds = new Set<string>();
    const reviewIds = new Set<string>();
    const ratingIds = new Set<string>();
    const gameSlugs = new Set<string>();

    activities.forEach((activity) => {
      if (activity.object_id) {
        if (activity.verb.startsWith('list:')) {
          listIds.add(activity.object_id);
        } else if (activity.verb === 'review:create') {
          reviewIds.add(activity.object_id);
        } else if (activity.verb === 'rating:update') {
          ratingIds.add(activity.object_id);
        }
      }

      const metadata = activity.metadata as Record<string, any> | null;
      const slug = metadata?.game_slug;
      if (slug) {
        gameSlugs.add(slug);
      }
    });

    const listPromise: Promise<ListSummary[]> = listIds.size
      ? this.prisma.lists.findMany({
          where: { id: { in: Array.from(listIds) } },
          select: {
            id: true,
            slug: true,
            title: true,
            is_public: true,
            is_backlog: true,
          },
        }) as Promise<ListSummary[]>
      : Promise.resolve<ListSummary[]>([]);

    const reviewPromise: Promise<ReviewSummary[]> = reviewIds.size
      ? this.prisma.reviews.findMany({
          where: { id: { in: Array.from(reviewIds) } },
          select: {
            id: true,
            title: true,
            has_spoilers: true,
            body: true,
            games: { select: { id: true, slug: true, title: true, cover_url: true } },
          },
        }) as Promise<ReviewSummary[]>
      : Promise.resolve<ReviewSummary[]>([]);

    const ratingPromise: Promise<RatingSummary[]> = ratingIds.size
      ? this.prisma.ratings.findMany({
          where: { id: { in: Array.from(ratingIds) } },
          select: {
            id: true,
            score: true,
            games: { select: { id: true, slug: true, title: true, cover_url: true } },
          },
        }) as Promise<RatingSummary[]>
      : Promise.resolve<RatingSummary[]>([]);

    const gamePromise: Promise<GameSummary[]> = gameSlugs.size
      ? this.prisma.games.findMany({
          where: { slug: { in: Array.from(gameSlugs) } },
          select: { id: true, slug: true, title: true, cover_url: true },
        }) as Promise<GameSummary[]>
      : Promise.resolve<GameSummary[]>([]);

    const [lists, reviews, ratings, games] = await Promise.all([
      listPromise,
      reviewPromise,
      ratingPromise,
      gamePromise,
    ]);

    const listMap = new Map<string, ListSummary>();
    const reviewMap = new Map<string, ReviewSummary>();
    const ratingMap = new Map<string, RatingSummary>();
    const gameMap = new Map<string, GameSummary>();

    lists.forEach((list) => listMap.set(list.id, list));
    reviews.forEach((review) => reviewMap.set(review.id, review));
    ratings.forEach((rating) => ratingMap.set(rating.id, rating));
    games.forEach((game) => gameMap.set(game.slug, game));

    return activities.map((activity) => {
      const metadata = (activity.metadata as Record<string, any> | null) ?? undefined;
      let payload: Record<string, any> | undefined;

      if (activity.verb.startsWith('list:') && activity.object_id) {
        const list = listMap.get(activity.object_id);
        if (list) {
          payload = { list, metadata };
          if (metadata?.game_slug) {
            payload.game = gameMap.get(metadata.game_slug);
          }
        }
      } else if (activity.verb === 'review:create' && activity.object_id) {
        const review = reviewMap.get(activity.object_id);
        if (review) {
          payload = {
            review: {
              id: review.id,
              title: review.title,
              has_spoilers: review.has_spoilers,
              excerpt: review.body.slice(0, 280),
            },
            game: review.games,
          };
        }
      } else if (activity.verb === 'rating:update' && activity.object_id) {
        const rating = ratingMap.get(activity.object_id);
        if (rating) {
          payload = {
            rating: { id: rating.id, score: rating.score },
            game: rating.games,
          };
        }
      } else if (activity.verb === 'follow' && activity.target_user) {
        payload = { target: activity.target_user };
      }

      return {
        id: activity.id,
        verb: activity.verb,
        created_at: activity.created_at,
        actor: activity.actor,
        object_type: activity.object_type,
        object_id: activity.object_id,
        metadata,
        payload,
      };
    });
  }

  async getFeed(userId: string, page?: number, take?: number) {
    const { limit, safePage, skip } = this.clampPagination(page, take);

    const now = new Date();
    const [following, muted] = await Promise.all([
      this.prisma.follows.findMany({
        where: { follower_id: userId },
        select: { followee_id: true },
      }),
      this.prisma.muted_users.findMany({
        where: { muter_id: userId, until: { gt: now } },
        select: { muted_id: true },
      }),
    ]);

    const followedIds = following.map((row) => row.followee_id);
    const mutedSet = new Set(muted.map((row) => row.muted_id));
    const visibleActors = followedIds.filter((id) => !mutedSet.has(id));

    if (!visibleActors.length) {
      return { total: 0, page: safePage, take: limit, items: [] };
    }

    const [total, activities] = await this.prisma.$transaction([
      this.prisma.activities.count({ where: { actor_id: { in: visibleActors } } }),
      this.prisma.activities.findMany({
        where: { actor_id: { in: visibleActors } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, display_name: true, avatar_url: true } },
          target_user: { select: { id: true, display_name: true, avatar_url: true } },
        },
      }),
    ]);

    const items = await this.hydrateActivities(activities);

    return {
      total,
      page: safePage,
      take: limit,
      items,
    };
  }

  async muteUser(muterId: string, mutedId: string, minutes = 60) {
    if (muterId === mutedId) {
      throw new BadRequestException('No puedes silenciarte a ti mismo');
    }

    const target = await this.prisma.users.findUnique({
      where: { id: mutedId },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const until = new Date(Date.now() + minutes * 60_000);

    await this.prisma.muted_users.upsert({
      where: { muter_id_muted_id: { muter_id: muterId, muted_id: mutedId } },
      update: { until },
      create: { muter_id: muterId, muted_id: mutedId, until },
    });

    return { muted: true, until };
  }

  async unmuteUser(muterId: string, mutedId: string) {
    await this.prisma.muted_users.deleteMany({
      where: { muter_id: muterId, muted_id: mutedId },
    });

    return { muted: false };
  }
}
