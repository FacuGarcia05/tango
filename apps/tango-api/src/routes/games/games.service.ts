import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  findMany(query: { q?: string; includeDlc?: boolean; take?: number; skip?: number }) {
    const { q, includeDlc, take = 20, skip = 0 } = query;
    return this.prisma.games.findMany({
      where: {
        AND: [
          q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {},
          includeDlc ? {} : { type: 'base' as any },
        ],
      },
      orderBy: { title: 'asc' },
      take, skip,
    });
  }
//a
  findBySlug(slug: string) {
    return this.prisma.games.findUnique({ where: { slug } });
  }

  findDlcsOf(slug: string) {
    return this.prisma.games.findFirst({ where: { slug } }).then(base =>
      base ? this.prisma.games.findMany({ where: { parent_game_id: base.id } }) : [],
    );
  }
}
