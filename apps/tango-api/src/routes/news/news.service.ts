import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsDto, UpdateNewsDto } from './dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(input: string): string {
    const base = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'noticia';
  }

  private async generateUniqueSlug(
    title: string,
    ignoreId?: string,
  ): Promise<string> {
    const base = this.slugify(title);
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.news.findFirst({
        where: {
          slug,
          ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
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

  private parseDate(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Fecha invalida');
    }

    return date;
  }

  async create(dto: CreateNewsDto) {
    const slug = await this.generateUniqueSlug(dto.title);

    const publishedAt = this.parseDate(dto.published_at);
    if (!publishedAt) {
      throw new BadRequestException('Fecha de publicacion requerida');
    }

    return this.prisma.news.create({
      data: {
        title: dto.title.trim(),
        slug,
        source: dto.source.trim(),
        source_url: dto.source_url,
        excerpt: dto.excerpt.trim(),
        cover_url: dto.cover_url ?? null,
        published_at: publishedAt,
        is_featured: dto.is_featured ?? false,
      },
    });
  }

  async list(page?: number, take?: number) {
    const limit = Math.min(Math.max(take ?? 20, 1), 50);
    const currentPage = Math.max(page ?? 1, 1);
    const skip = (currentPage - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.news.count(),
      this.prisma.news.findMany({
        orderBy: { published_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          source: true,
          excerpt: true,
          published_at: true,
          slug: true,
          cover_url: true,
        },
      }),
    ]);

    return {
      total,
      page: currentPage,
      take: limit,
      items,
    };
  }

  async findBySlug(slug: string) {
    const news = await this.prisma.news.findUnique({ where: { slug } });
    if (!news) {
      throw new NotFoundException('Noticia no encontrada');
    }

    return news;
  }

  async update(slug: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.news.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });

    if (!existing) {
      throw new NotFoundException('Noticia no encontrada');
    }

    const data: Record<string, unknown> = {};

    if (dto.title) {
      data.title = dto.title.trim();
      data.slug = await this.generateUniqueSlug(dto.title, existing.id);
    }

    if (dto.source !== undefined) {
      data.source = dto.source.trim();
    }

    if (dto.source_url !== undefined) {
      data.source_url = dto.source_url;
    }

    if (dto.excerpt !== undefined) {
      data.excerpt = dto.excerpt.trim();
    }

    if (dto.cover_url !== undefined) {
      data.cover_url = dto.cover_url ?? null;
    }

    if (dto.published_at !== undefined) {
      const parsed = this.parseDate(dto.published_at);
      if (!parsed) {
        throw new BadRequestException('Fecha de publicacion requerida');
      }
      data.published_at = parsed;
    }

    if (dto.is_featured !== undefined) {
      data.is_featured = dto.is_featured;
    }

    return this.prisma.news.update({
      where: { id: existing.id },
      data,
    });
  }

  async remove(slug: string) {
    const existing = await this.prisma.news.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Noticia no encontrada');
    }

    await this.prisma.news.delete({ where: { id: existing.id } });
  }

  async featuredForHomepage() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.prisma.news.findMany({
      where: {
        is_featured: true,
        published_at: { gte: weekAgo },
      },
      orderBy: { published_at: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        cover_url: true,
        excerpt: true,
        source: true,
        published_at: true,
        source_url: true,
      },
    });
  }
}
