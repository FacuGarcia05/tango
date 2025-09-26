import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface UserWithProfileResult {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  profiles: { bio: string | null; backdrop_url?: string | null } | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { profiles: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.presentUser(user as UserWithProfileResult);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const exists = await this.prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userData: Prisma.usersUpdateInput = {};

    if (dto.displayName !== undefined) {
      const name = dto.displayName.trim();
      if (name.length < 2) {
        throw new BadRequestException('El nombre debe tener al menos 2 caracteres');
      }
      userData.display_name = name;
    }

    if (dto.avatarUrl !== undefined) {
      const avatar = this.normalizeUrl(dto.avatarUrl, 'avatarUrl');
      userData.avatar_url = avatar ?? null;
    }

    if (Object.keys(userData).length) {
      await this.prisma.users.update({ where: { id: userId }, data: userData });
    }

    const bioNormalized = dto.bio === undefined ? undefined : dto.bio.trim();
    const backdropNormalized = dto.backdropUrl === undefined ? undefined : this.normalizeUrl(dto.backdropUrl, 'backdropUrl');

    if (bioNormalized !== undefined && bioNormalized.length > 280) {
      throw new BadRequestException('La bio puede tener como maximo 280 caracteres');
    }

    if (bioNormalized !== undefined || backdropNormalized !== undefined) {
      const updateData: any = {};
      if (bioNormalized !== undefined) {
        updateData.bio = bioNormalized || null;
      }
      if (backdropNormalized !== undefined) {
        updateData.backdrop_url = backdropNormalized ?? null;
      }

      const createData: any = {
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
      } as any);
    }

    return this.getMe(userId);
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
    const profile = user.profiles as (UserWithProfileResult['profiles'] & { backdrop_url?: string | null }) | null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url ?? null,
      bio: profile?.bio ?? null,
      backdropUrl: (profile as any)?.backdrop_url ?? null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}