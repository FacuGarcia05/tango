import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, party_status } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartyDto } from './dto';

type PartyWithMembers = Prisma.partiesGetPayload<{
  include: {
    users: { select: { id: true; display_name: true; avatar_url: true } };
    party_members: {
      include: { users: { select: { id: true; display_name: true; avatar_url: true } } };
    };
  };
}>;

export interface PartySummary {
  id: string;
  game_id: string;
  host_user_id: string;
  platform: string | null;
  timezone: string | null;
  capacity: number;
  status: party_status;
  description: string | null;
  created_at: Date;
  host: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  members: Array<{
    id: string;
    joined_at: Date;
    user: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    } | null;
  }>;
  member_count: number;
}

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapParty(party: PartyWithMembers): PartySummary {
    const members = party.party_members.map((member) => ({
      id: `${member.party_id}:${member.user_id}`,
      joined_at: member.joined_at,
      user: member.users
        ? {
            id: member.users.id,
            display_name: member.users.display_name,
            avatar_url: member.users.avatar_url ?? null,
          }
        : null,
    }));

    return {
      id: party.id,
      game_id: party.game_id,
      host_user_id: party.host_user_id,
      platform: party.platform,
      timezone: party.timezone,
      capacity: party.capacity,
      status: party.status,
      description: party.description,
      created_at: party.created_at,
      host: party.users
        ? {
            id: party.users.id,
            display_name: party.users.display_name,
            avatar_url: party.users.avatar_url ?? null,
          }
        : null,
      members,
      member_count: members.length,
    };
  }

  private async ensureGameBySlug(slug: string) {
    const game = await this.prisma.games.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }
    return game;
  }

  private async fetchPartyById(id: string): Promise<PartySummary> {
    const party = await this.prisma.parties.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
        party_members: {
          include: {
            users: { select: { id: true, display_name: true, avatar_url: true } },
          },
        },
      },
    });

    if (!party) {
      throw new NotFoundException('Party no encontrada');
    }

    return this.mapParty(party);
  }

  async listByGameSlug(slug: string) {
    const game = await this.ensureGameBySlug(slug);

    const parties = await this.prisma.parties.findMany({
      where: {
        game_id: game.id,
        status: { not: 'cancelled' },
      },
      orderBy: [{ created_at: 'desc' }],
      include: {
        users: { select: { id: true, display_name: true, avatar_url: true } },
        party_members: {
          include: {
            users: { select: { id: true, display_name: true, avatar_url: true } },
          },
        },
      },
    });

    const priority: Record<party_status, number> = {
      open: 0,
      full: 1,
      closed: 2,
      cancelled: 3,
    };

    return parties
      .map((party) => this.mapParty(party))
      .sort((a, b) => priority[a.status] - priority[b.status]);
  }

  async createForGame(slug: string, dto: CreatePartyDto, userId: string) {
    const game = await this.ensureGameBySlug(slug);
    const platform = dto.platform.trim();
    const timezone = dto.timezone.trim();
    const description = dto.description?.trim() ?? null;

    const existingHosting = await this.prisma.parties.findFirst({
      where: {
        game_id: game.id,
        host_user_id: userId,
        status: { in: ['open', 'full'] },
      },
      select: { id: true },
    });

    if (existingHosting) {
      throw new BadRequestException('Ya creaste una party activa para este juego');
    }

    const party = await this.prisma.$transaction(async (trx) => {
      const created = await trx.parties.create({
        data: {
          game_id: game.id,
          host_user_id: userId,
          platform,
          timezone,
          capacity: dto.capacity,
          description,
        },
      });

      await trx.party_members.create({
        data: {
          party_id: created.id,
          user_id: userId,
        },
      });

      return created;
    });

    return this.fetchPartyById(party.id);
  }

  async joinParty(id: string, userId: string) {
    const party = await this.prisma.parties.findUnique({
      where: { id },
      include: { party_members: true },
    });
    if (!party) {
      throw new NotFoundException('Party no encontrada');
    }
    if (party.status !== 'open') {
      throw new BadRequestException('La party no esta abierta a nuevas personas');
    }
    if (party.host_user_id === userId) {
      throw new BadRequestException('Sos el anfitrion de esta party');
    }
    if (party.party_members.some((member) => member.user_id === userId)) {
      throw new BadRequestException('Ya formas parte de esta party');
    }

    if (party.party_members.length >= party.capacity) {
      await this.prisma.parties.update({
        where: { id },
        data: { status: 'full' },
      });
      throw new BadRequestException('La party ya esta completa');
    }

    await this.prisma.party_members.create({
      data: {
        party_id: id,
        user_id: userId,
      },
    });

    const updatedCount = party.party_members.length + 1;
    if (updatedCount >= party.capacity) {
      await this.prisma.parties.update({
        where: { id },
        data: { status: 'full' },
      });
    }

    return this.fetchPartyById(id);
  }

  async closeParty(id: string, userId: string) {
    const party = await this.prisma.parties.findUnique({
      where: { id },
      select: { id: true, host_user_id: true, status: true },
    });
    if (!party) {
      throw new NotFoundException('Party no encontrada');
    }
    if (party.host_user_id !== userId) {
      throw new ForbiddenException('Solo el anfitrion puede cerrar la party');
    }
    if (party.status === 'closed') {
      return this.fetchPartyById(id);
    }

    await this.prisma.parties.update({
      where: { id },
      data: { status: 'closed' },
    });

    return this.fetchPartyById(id);
  }

  async deleteParty(id: string, userId: string) {
    const party = await this.prisma.parties.findUnique({
      where: { id },
      select: { host_user_id: true, status: true },
    });
    if (!party) {
      throw new NotFoundException('Party no encontrada');
    }
    if (party.host_user_id !== userId) {
      throw new ForbiddenException('Solo el anfitrion puede eliminar la party');
    }
    if (party.status !== 'closed') {
      throw new BadRequestException('Debes cerrar la party antes de eliminarla');
    }

    await this.prisma.parties.delete({ where: { id } });
    return { id };
  }
}
