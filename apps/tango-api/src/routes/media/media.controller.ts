import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';

import { UploadsService } from '../../common/upload/uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

type ClipProvider = 'youtube' | 'twitch';

interface ClipInfo {
  provider: ClipProvider;
  providerId: string;
  url: string;
}

@ApiTags('Media')
@Controller()
export class MediaController {
  private static readonly MAX_MEDIA_PER_USER = 5;

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('users/me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir avatar del usuario autenticado' })
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    const upload = await this.handleUpload(file, 'avatars');

    await this.prisma.users.update({
      where: { id: user.sub },
      data: { avatar_url: upload.url },
    });
    await this.prisma.profiles.upsert({
      where: { user_id: user.sub },
      update: { avatar_url: upload.url },
      create: {
        user_id: user.sub,
        avatar_url: upload.url,
        backdrop_url: null,
        bio: null,
        fav_genres: [],
        fav_platforms: [],
      },
    });

    return upload;
  }

  @Post('users/me/backdrop')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir backdrop del usuario autenticado' })
  async uploadBackdrop(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    const upload = await this.handleUpload(file, 'backdrops');

    await this.prisma.profiles.upsert({
      where: { user_id: user.sub },
      update: { backdrop_url: upload.url },
      create: {
        user_id: user.sub,
        avatar_url: null,
        backdrop_url: upload.url,
        bio: null,
        fav_genres: [],
        fav_platforms: [],
      },
    });

    return upload;
  }

  @Post('games/:slug/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir portada de un juego' })
  async uploadGameCover(
    @Param('slug') slug: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    const game = await this.prisma.games.findUnique({ where: { slug } });
    if (!game) {
      throw new BadRequestException('Juego no encontrado');
    }

    const upload = await this.handleUpload(file, 'covers');
    await this.prisma.games.update({
      where: { id: game.id },
      data: { cover_url: upload.url },
    });
    return upload;
  }

  @Post('games/:slug/media/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Subir imagen a la galeria de un juego' })
  async uploadGameImage(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    const game = await this.prisma.games.findUnique({ where: { slug } });
    if (!game) {
      throw new BadRequestException('Juego no encontrado');
    }

    await this.assertMediaQuota(game.id, user.sub);

    const upload = await this.handleUpload(file, 'game-media');
    await this.prisma.game_media.create({
      data: {
        game_id: game.id,
        user_id: user.sub,
        type: 'image',
        url: upload.url,
        provider: upload.provider,
        provider_id: upload.providerId,
      },
    });

    return upload;
  }

  @Post('games/:slug/media/clip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Agregar un clip de YouTube o Twitch a la galeria de un juego' })
  async uploadGameClip(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
    @Body('url') rawUrl?: string,
  ) {
    const url = rawUrl?.trim();
    if (!url) {
      throw new BadRequestException('Debes enviar un enlace valido');
    }

    const game = await this.prisma.games.findUnique({ where: { slug } });
    if (!game) {
      throw new BadRequestException('Juego no encontrado');
    }

    await this.assertMediaQuota(game.id, user.sub);
    const clip = this.parseClipUrl(url);
    if (!clip) {
      throw new BadRequestException('Solo aceptamos enlaces de YouTube o Twitch');
    }

    await this.prisma.game_media.create({
      data: {
        game_id: game.id,
        user_id: user.sub,
        type: 'video',
        url: clip.url,
        provider: clip.provider,
        provider_id: clip.providerId,
      },
    });

    return clip;
  }

  private async assertMediaQuota(gameId: string, userId: string) {
    const current = await this.prisma.game_media.count({
      where: { game_id: gameId, user_id: userId, is_hidden: false },
    });

    if (current >= MediaController.MAX_MEDIA_PER_USER) {
      throw new BadRequestException(
        `Solo podes compartir hasta ${MediaController.MAX_MEDIA_PER_USER} aportes por juego`,
      );
    }
  }

  private parseClipUrl(input: string): ClipInfo | null {
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      const youtubeId =
        parsed.searchParams.get('v') ||
        (parsed.pathname.startsWith('/shorts/')
          ? parsed.pathname.replace('/shorts/', '').split('/')[0]
          : null) ||
        (hostname.includes('youtu.be')
          ? parsed.pathname.replace('/', '').split('/')[0]
          : null);

      if (!youtubeId) {
        return null;
      }

      return {
        provider: 'youtube',
        providerId: youtubeId,
        url: `https://youtu.be/${youtubeId}`,
      };
    }

    if (hostname.includes('twitch.tv')) {
      const normalizedPath = parsed.pathname.replace(/\/+$/, '');

      if (hostname === 'clips.twitch.tv') {
        const slug = normalizedPath.replace(/^\/+/, '').split('/')[0];
        if (!slug) {
          return null;
        }

        return {
          provider: 'twitch',
          providerId: slug,
          url: `https://clips.twitch.tv/${slug}`,
        };
      }

      const clipIndex = normalizedPath.indexOf('/clip/');
      if (clipIndex >= 0) {
        const slug = normalizedPath.slice(clipIndex + 6).split('/')[0];
        if (!slug) {
          return null;
        }

        return {
          provider: 'twitch',
          providerId: slug,
          url: `https://clips.twitch.tv/${slug}`,
        };
      }

      if (normalizedPath.startsWith('/videos/')) {
        const videoId = normalizedPath.replace('/videos/', '').split('/')[0];
        if (!videoId) {
          return null;
        }

        return {
          provider: 'twitch',
          providerId: videoId,
          url: `https://www.twitch.tv/videos/${videoId}`,
        };
      }
    }

    return null;
  }

  private async handleUpload(file: Express.Multer.File, folder: string) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    if (file.size > this.uploadsService.maxFileSize) {
      throw new BadRequestException('El archivo supera el limite de 5MB');
    }

    return this.uploadsService.handleUpload(file, folder);
  }
}

