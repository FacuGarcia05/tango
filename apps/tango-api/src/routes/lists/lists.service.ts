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
  AddListItemDto,
  CreateListDto,
  ReorderListDto,
  UpdateListDto,
} from './dto';

type ListWithOwnerAndItems = Prisma.listsGetPayload<{
  include: {
    users: { select: { id: true; display_name: true } };
    list_items: {
      orderBy: { position: 'asc' };
      include: {
        games: {
          select: { id: true; slug: true; title: true; cover_url: true };
        };
      };
    };
    _count: { select: { list_items: true } };
  };
}>;

type ListWithItems = Prisma.listsGetPayload<{
  include: {
    list_items: {
      orderBy: { position: 'asc' };
      include: {
        games: {
          select: { id: true; slug: true; title: true; cover_url: true };
        };
      };
    };
    _count: { select: { list_items: true } };
  };
}>;

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  private normalizeTitle(title: string): string {
    return title.trim();
  }

  private normalizeDescription(description?: string | null): string | null {
    const trimmed = description?.trim();
    return trimmed && trimmed.length ? trimmed : null;
  }

  private slugify(input: string): string {
    const base = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return base || 'lista';
  }

  private async generateUniqueSlug(
    title: string,
    ignoreListId?: string,
  ): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.lists.findFirst({
        where: {
          slug,
          ...(ignoreListId
            ? {
                NOT: { id: ignoreListId },
              }
            : {}),
        },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }

  private assertOwnership(list: { user_id: string }, userId: string) {
    if (list.user_id !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta lista',
      );
    }
  }

  private mapList(list: ListWithItems) {
    return {
      id: list.id,
      slug: list.slug,
      title: list.title,
      description: list.description,
      is_public: list.is_public,
      is_backlog: list.is_backlog,
      created_at: list.created_at,
      updated_at: list.updated_at,
      items_count: list._count.list_items,
      items: list.list_items.map((item) => ({
        id: item.id,
        position: item.position,
        note: item.note,
        created_at: item.created_at,
        game: item.games,
      })),
    };
  }

  private mapListWithOwner(list: ListWithOwnerAndItems) {
    return {
      ...this.mapList(list),
      owner: {
        id: list.users.id,
        display_name: list.users.display_name,
      },
    };
  }

  async create(userId: string, dto: CreateListDto) {
    const title = this.normalizeTitle(dto.title);
    if (!title) {
      throw new BadRequestException('El titulo es requerido');
    }

    const slug = await this.generateUniqueSlug(title);

    const list = await this.prisma.lists.create({
      data: {
        user_id: userId,
        title,
        slug,
        description: this.normalizeDescription(dto.description),
        is_public: dto.isPublic ?? true,
      },
      include: {
        list_items: {
          include: {
            games: {
              select: { id: true, slug: true, title: true, cover_url: true },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { list_items: true } },
      },
    });

    await this.activity.recordActivity({
      actorId: userId,
      verb: 'list:create',
      objectType: 'list',
      objectId: list.id,
      metadata: { list_slug: list.slug, list_title: list.title },
    });

    return this.mapList(list);
  }

  async findMine(userId: string) {
    const lists = await this.prisma.lists.findMany({
      where: { user_id: userId, is_backlog: false },
      orderBy: [{ created_at: 'desc' }],
      include: {
        list_items: {
          include: {
            games: {
              select: { id: true, slug: true, title: true, cover_url: true },
            },
          },
          orderBy: { position: 'asc' },
          take: 5,
        },
        _count: { select: { list_items: true } },
      },
    });

    return lists.map((list) => ({
      id: list.id,
      slug: list.slug,
      title: list.title,
      description: list.description,
      is_public: list.is_public,
      is_backlog: list.is_backlog,
      created_at: list.created_at,
      updated_at: list.updated_at,
      items_count: list._count.list_items,
      items_preview: list.list_items.map((item) => ({
        id: item.id,
        position: item.position,
        note: item.note,
        game: item.games,
      })),
    }));
  }

  async findBySlug(slug: string, viewerId?: string) {
    const list = await this.prisma.lists.findUnique({
      where: { slug },
      include: {
        users: { select: { id: true, display_name: true } },
        list_items: {
          include: {
            games: {
              select: { id: true, slug: true, title: true, cover_url: true },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { list_items: true } },
      },
    });

    if (!list) {
      throw new NotFoundException('Lista no encontrada');
    }

    if (!list.is_public && list.user_id !== viewerId) {
      throw new NotFoundException('Lista no encontrada');
    }

    return this.mapListWithOwner(list);
  }

  async update(userId: string, slug: string, dto: UpdateListDto) {
    const list = await this.prisma.lists.findUnique({
      where: { slug },
      select: {
        id: true,
        user_id: true,
        title: true,
        is_public: true,
      },
    });

    if (!list) {
      throw new NotFoundException('Lista no encontrada');
    }

    this.assertOwnership(list, userId);

    const data: Prisma.listsUpdateInput = {};
    let publishActivity = false;

    if (dto.title) {
      const newTitle = this.normalizeTitle(dto.title);
      data.title = newTitle;
      data.slug = await this.generateUniqueSlug(newTitle, list.id);
    }

    if (dto.description !== undefined) {
      data.description = this.normalizeDescription(dto.description);
    }

    if (dto.isPublic !== undefined) {
      data.is_public = dto.isPublic;
      if (dto.isPublic && !list.is_public) {
        publishActivity = true;
      }
    }

    if (!Object.keys(data).length) {
      return this.findBySlug(slug, userId);
    }

    const updated = await this.prisma.lists.update({
      where: { id: list.id },
      data,
      include: {
        users: { select: { id: true, display_name: true } },
        list_items: {
          include: {
            games: {
              select: { id: true, slug: true, title: true, cover_url: true },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { list_items: true } },
      },
    });

    if (publishActivity) {
      await this.activity.recordActivity({
        actorId: userId,
        verb: 'list:publish',
        objectType: 'list',
        objectId: updated.id,
        metadata: { list_slug: updated.slug, list_title: updated.title },
      });
    }

    return this.mapListWithOwner(updated);
  }

  async remove(userId: string, slug: string) {
    const list = await this.prisma.lists.findUnique({
      where: { slug },
      select: { id: true, user_id: true, is_backlog: true },
    });

    if (!list) {
      throw new NotFoundException('Lista no encontrada');
    }

    this.assertOwnership(list, userId);

    await this.prisma.lists.delete({
      where: { id: list.id },
    });

    return { success: true };
  }

  private async ensureListOwner(slug: string, userId: string) {
    const list = await this.prisma.lists.findUnique({
      where: { slug },
      include: {
        list_items: {
          include: {
            games: {
              select: { id: true, slug: true, title: true, cover_url: true },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { list_items: true } },
      },
    });

    if (!list) {
      throw new NotFoundException('Lista no encontrada');
    }

    this.assertOwnership(list, userId);
    return list;
  }

  async addItem(userId: string, slug: string, dto: AddListItemDto) {
    const list = await this.ensureListOwner(slug, userId);

    const game = await this.prisma.games.findUnique({
      where: { slug: dto.gameSlug },
      select: { id: true, slug: true, title: true, cover_url: true },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const existing = await this.prisma.list_items.findUnique({
      where: { list_id_game_id: { list_id: list.id, game_id: game.id } },
    });

    if (existing) {
      throw new BadRequestException('El juego ya esta en la lista');
    }

    const last = await this.prisma.list_items.findFirst({
      where: { list_id: list.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const nextPosition = (last?.position ?? 0) + 1;

    const item = await this.prisma.list_items.create({
      data: {
        list_id: list.id,
        game_id: game.id,
        position: nextPosition,
        note: this.normalizeDescription(dto.note),
      },
      include: {
        games: {
          select: { id: true, slug: true, title: true, cover_url: true },
        },
      },
    });

    await this.activity.recordActivity({
      actorId: userId,
      verb: 'list:add',
      objectType: 'list',
      objectId: list.id,
      metadata: {
        list_slug: list.slug,
        list_title: list.title,
        game_id: game.id,
        game_slug: game.slug,
        game_title: game.title,
      },
    });

    return {
      id: item.id,
      position: item.position,
      note: item.note,
      created_at: item.created_at,
      game: item.games,
    };
  }

  async removeItem(userId: string, slug: string, gameSlug: string) {
    const list = await this.ensureListOwner(slug, userId);

    const game = await this.prisma.games.findUnique({
      where: { slug: gameSlug },
      select: { id: true },
    });

    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const existing = await this.prisma.list_items.findUnique({
      where: { list_id_game_id: { list_id: list.id, game_id: game.id } },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('El juego no esta en la lista');
    }

    await this.prisma.list_items.delete({ where: { id: existing.id } });

    return { success: true };
  }

  async reorder(userId: string, slug: string, dto: ReorderListDto) {
    const list = await this.ensureListOwner(slug, userId);
    const payloadIds = new Set(dto.items.map((item) => item.gameId));

    if (payloadIds.size !== dto.items.length) {
      throw new BadRequestException(
        'No se permiten juegos duplicados en el reordenamiento',
      );
    }

    const existingGameIds = new Set(
      list.list_items.map((item) => item.game_id),
    );
    for (const id of payloadIds) {
      if (!existingGameIds.has(id)) {
        throw new BadRequestException(
          'Todos los juegos deben pertenecer a la lista',
        );
      }
    }

    const updates = dto.items.map((item) =>
      this.prisma.list_items.updateMany({
        where: { list_id: list.id, game_id: item.gameId },
        data: { position: item.position },
      }),
    );

    await this.prisma.$transaction(updates);

    await this.activity.recordActivity({
      actorId: userId,
      verb: 'list:reorder',
      objectType: 'list',
      objectId: list.id,
      metadata: { list_slug: list.slug, list_title: list.title },
    });

    return this.findBySlug(slug, userId);
  }

  async findPublicByUser(userId: string, page = 1, take = 20) {
    const limit = Math.min(Math.max(take, 1), 50);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * limit;

    const [total, lists] = await this.prisma.$transaction([
      this.prisma.lists.count({
        where: { user_id: userId, is_public: true, is_backlog: false },
      }),
      this.prisma.lists.findMany({
        where: { user_id: userId, is_public: true, is_backlog: false },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        include: {
          list_items: {
            include: {
              games: {
                select: { id: true, slug: true, title: true, cover_url: true },
              },
            },
            orderBy: { position: 'asc' },
            take: 5,
          },
          _count: { select: { list_items: true } },
        },
      }),
    ]);

    return {
      total,
      page: currentPage,
      take: limit,
      items: lists.map((list) => ({
        id: list.id,
        slug: list.slug,
        title: list.title,
        description: list.description,
        is_public: list.is_public,
        is_backlog: list.is_backlog,
        created_at: list.created_at,
        updated_at: list.updated_at,
        items_count: list._count.list_items,
        items_preview: list.list_items.map((item) => ({
          id: item.id,
          position: item.position,
          note: item.note,
          game: item.games,
        })),
      })),
    };
  }
}
