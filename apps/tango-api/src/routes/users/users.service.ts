import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

type UserWithProfileResult = Prisma.usersGetPayload<{ include: { profiles: true } }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.findUserWithProfile(userId);
    return this.presentUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureUserExists(userId);

    const userData: Prisma.usersUpdateInput = {};

    if (dto.displayName !== undefined) {
      const name = dto.displayName.trim();
      if (name.length < 2) {
        throw new BadRequestException("El nombre debe tener al menos 2 caracteres");
      }
      userData.display_name = name;
    }

    if (dto.avatarUrl !== undefined) {
      const avatar = this.normalizeUrl(dto.avatarUrl, "avatarUrl");
      userData.avatar_url = avatar ?? null;
    }

    if (Object.keys(userData).length) {
      await this.prisma.users.update({ where: { id: userId }, data: userData });
    }

    const bioNormalized = dto.bio === undefined ? undefined : dto.bio.trim();
    const backdropNormalized = dto.backdropUrl === undefined ? undefined : this.normalizeUrl(dto.backdropUrl, "backdropUrl");

    if (bioNormalized !== undefined && bioNormalized.length > 280) {
      throw new BadRequestException("La bio puede tener como maximo 280 caracteres");
    }

    if (bioNormalized !== undefined || backdropNormalized !== undefined) {
      const updateData: Prisma.profilesUncheckedUpdateInput = {};
      if (bioNormalized !== undefined) {
        updateData.bio = bioNormalized || null;
      }
      if (backdropNormalized !== undefined) {
        updateData.backdrop_url = backdropNormalized ?? null;
      }

      const createData: Prisma.profilesUncheckedCreateInput = {
        user_id: userId,
        bio: bioNormalized ?? null,
        backdrop_url: backdropNormalized ?? null,
        fav_genres: [],
        fav_platforms: [],
      };

      await this.prisma.profiles.upsert({
        where: { user_id: userId },
        update: updateData,
        create: createData,
      });
    }

    return this.getMe(userId);
  }

  async follow(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException("No podes seguirte a vos mismo");
    }

    await this.ensureUserExists(targetId);

    try {
      await this.prisma.follows.create({
        data: { follower_id: userId, followee_id: targetId },
      });
    } catch (error) {
      if (this.isPrismaError(error, "P2002")) {
        throw new ConflictException("Ya sigues a este usuario");
      }
      throw error;
    }

    return this.getFollowStats(targetId, userId);
  }

  async unfollow(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new NotFoundException("No sigues a este usuario");
    }

    try {
      await this.prisma.follows.delete({
        where: {
          follower_id_followee_id: {
            follower_id: userId,
            followee_id: targetId,
          },
        },
      });
    } catch (error) {
      if (this.isPrismaError(error, "P2025")) {
        throw new NotFoundException("No sigues a este usuario");
      }
      throw error;
    }

    return this.getFollowStats(targetId, userId);
  }

  async getFollowStats(targetId: string, viewerId?: string) {
    await this.ensureUserExists(targetId);

    const [followers, following, viewerFollow] = await Promise.all([
      this.prisma.follows.count({ where: { followee_id: targetId } }),
      this.prisma.follows.count({ where: { follower_id: targetId } }),
      viewerId
        ? this.prisma.follows.findUnique({
            where: {
              follower_id_followee_id: { follower_id: viewerId, followee_id: targetId },
            },
            select: { follower_id: true },
          })
        : Promise.resolve(null),
    ]);

    const response: { followers: number; following: number; isFollowing?: boolean } = {
      followers,
      following,
    };

    if (viewerId && viewerId !== targetId) {
      response.isFollowing = Boolean(viewerFollow);
    }

    if (viewerId && viewerId === targetId) {
      response.isFollowing = false;
    }

    return response;
  }

  async getSummary(targetId: string, viewerId?: string) {
    const user = await this.findUserWithProfile(targetId);

    const [reviewCount, ratingCount, followStats] = await Promise.all([
      this.prisma.reviews.count({ where: { user_id: targetId, is_deleted: false } }),
      this.prisma.ratings.count({ where: { user_id: targetId } }),
      this.getFollowStats(targetId, viewerId),
    ]);

    return {
      user: this.presentUser(user),
      profile: this.presentProfile(user),
      followers: followStats.followers,
      following: followStats.following,
      reviewsCount: reviewCount,
      ratingsCount: ratingCount,
      isFollowing: followStats.isFollowing,
    };
  }

  async searchUsers(viewerId: string | undefined, q?: string, take = 10, skip = 0) {
    const query = q?.trim() ?? "";
    if (!query.length) {
      return { total: 0, items: [] as Array<Record<string, unknown>> };
    }

    const { limit, offset } = this.sanitizePagination(take, skip);

    const where: Prisma.usersWhereInput = {
      OR: [
        { display_name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        orderBy: { display_name: "asc" },
        take: limit,
        skip: offset,
        include: { profiles: true },
      }),
    ]);

    if (!users.length) {
      return { total, items: [] };
    }

    type FollowAggregate = { followee_id: string; _count: { followee_id: number } };
    type FollowingAggregate = { follower_id: string; _count: { follower_id: number } };

    const userIds = users.map((user) => user.id);

    const [followerCounts, followingCounts, viewerFollowing] = await Promise.all([
      this.prisma.follows.groupBy({
        by: ["followee_id"],
        where: { followee_id: { in: userIds } },
        _count: { followee_id: true },
      }),
      this.prisma.follows.groupBy({
        by: ["follower_id"],
        where: { follower_id: { in: userIds } },
        _count: { follower_id: true },
      }),
      viewerId
        ? this.prisma.follows.findMany({
            where: { follower_id: viewerId, followee_id: { in: userIds } },
            select: { followee_id: true },
          })
        : Promise.resolve([]),
    ]);

    const followerMap = new Map<string, number>();
    (followerCounts as FollowAggregate[]).forEach((entry) => followerMap.set(entry.followee_id, entry._count.followee_id));

    const followingMap = new Map<string, number>();
    (followingCounts as FollowingAggregate[]).forEach((entry) => followingMap.set(entry.follower_id, entry._count.follower_id));

    const viewerFollowingSet = new Set<string>();
    (viewerFollowing as Array<{ followee_id: string }>).forEach((entry) => viewerFollowingSet.add(entry.followee_id));

    const items = users.map((user) => {
      const presented = this.presentUser(user);
      return {
        id: presented.id,
        displayName: presented.displayName,
        avatarUrl: presented.avatarUrl ?? null,
        bio: presented.bio ?? null,
        followers: followerMap.get(user.id) ?? 0,
        following: followingMap.get(user.id) ?? 0,
        isFollowing: viewerId ? viewerFollowingSet.has(user.id) : false,
      };
    });

    return { total, items };
  }

  private async ensureUserExists(userId: string) {
    const exists = await this.prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Usuario no encontrado");
    }
  }

  private async findUserWithProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { profiles: true },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user as UserWithProfileResult;
  }

  private normalizeUrl(value: string | null | undefined, field: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException(`El campo ${field} debe ser una URL valida (http/https)`);
    }

    return trimmed;
  }

  private presentUser(user: UserWithProfileResult) {
    const profile = user.profiles;

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: profile?.avatar_url ?? user.avatar_url ?? null,
      emailVerifiedAt: user.email_verified_at,
      provider: user.provider,
      providerId: user.provider_id,
      bio: profile?.bio ?? null,
      backdropUrl: profile?.backdrop_url ?? null,
    };
  }

  private presentProfile(user: UserWithProfileResult) {
    const profile = user.profiles;
    return {
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatar_url ?? user.avatar_url ?? null,
      backdropUrl: profile?.backdrop_url ?? null,
      favGenres: profile?.fav_genres ?? [],
      favPlatforms: profile?.fav_platforms ?? [],
    };
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return error instanceof PrismaClientKnownRequestError && error.code === code;
  }

  private sanitizePagination(take?: number, skip?: number) {
    const limit = Math.min(Math.max(take ?? 10, 1), 50);
    const offset = Math.max(skip ?? 0, 0);
    return { limit, offset };
  }
}
