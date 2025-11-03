import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface BacklogGameSummary {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
}

export interface BacklogEntryDto {
  id: string;
  created_at: Date;
  game: BacklogGameSummary;
}

export interface BacklogListResponse {
  count: number;
  items: BacklogEntryDto[];
}

export interface ToggleResponse {
  inBacklog: boolean;
  count: number;
}

@Injectable()
export class BacklogService {
  constructor(private readonly prisma: PrismaService) {}

  private mapEntry(entry: {
    id: string;
    created_at: Date;
    games: {
      id: string;
      slug: string;
      title: string;
      cover_url: string | null;
    };
  }): BacklogEntryDto {
    return {
      id: entry.id,
      created_at: entry.created_at,
      game: {
        id: entry.games.id,
        slug: entry.games.slug,
        title: entry.games.title,
        cover_url: entry.games.cover_url,
      },
    };
  }

  async list(userId: string): Promise<BacklogListResponse> {
    const entries = await this.prisma.backlog_entries.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        games: {
          select: { id: true, slug: true, title: true, cover_url: true },
        },
      },
    });

    return {
      count: entries.length,
      items: entries.map((entry) => this.mapEntry(entry)),
    };
  }

  async contains(
    userId: string,
    gameSlug: string,
  ): Promise<{ inBacklog: boolean }> {
    const entry = await this.prisma.backlog_entries.findFirst({
      where: { user_id: userId, games: { slug: gameSlug } },
      select: { id: true },
    });

    return { inBacklog: Boolean(entry) };
  }

  async add(userId: string, gameSlug: string): Promise<ToggleResponse> {
    const game = await this.prisma.games.findUnique({
      where: { slug: gameSlug },
      select: { id: true },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const existing = await this.prisma.backlog_entries.findUnique({
      where: { user_id_game_id: { user_id: userId, game_id: game.id } },
      select: { id: true },
    });

    if (existing) {
      const count = await this.prisma.backlog_entries.count({
        where: { user_id: userId },
      });
      return { inBacklog: true, count };
    }

    await this.prisma.backlog_entries.create({
      data: { user_id: userId, game_id: game.id },
    });

    const count = await this.prisma.backlog_entries.count({
      where: { user_id: userId },
    });

    return { inBacklog: true, count };
  }

  async remove(userId: string, gameSlug: string): Promise<ToggleResponse> {
    const game = await this.prisma.games.findUnique({
      where: { slug: gameSlug },
      select: { id: true },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    await this.prisma.backlog_entries.deleteMany({
      where: { user_id: userId, game_id: game.id },
    });

    const count = await this.prisma.backlog_entries.count({
      where: { user_id: userId },
    });

    return { inBacklog: false, count };
  }
}
