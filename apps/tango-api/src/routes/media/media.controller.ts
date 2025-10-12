import { BadRequestException, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Express } from "express";

import { UploadsService } from "../../common/upload/uploads.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/auth.service";
import { JwtAuthGuard } from "../auth/jwt.guard";

@ApiTags("Media")
@Controller()
export class MediaController {
  constructor(private readonly uploadsService: UploadsService, private readonly prisma: PrismaService) {}

  @Post("users/me/avatar")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiCookieAuth("access_token")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Subir avatar del usuario autenticado" })
  async uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo");
    }

    const upload = await this.handleUpload(file, "avatars");

    await this.prisma.users.update({ where: { id: user.sub }, data: { avatar_url: upload.url } });
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

  @Post("users/me/backdrop")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiCookieAuth("access_token")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Subir backdrop del usuario autenticado" })
  async uploadBackdrop(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo");
    }

    const upload = await this.handleUpload(file, "backdrops");

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

  @Post("games/:slug/cover")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiCookieAuth("access_token")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Subir portada de un juego" })
  async uploadGameCover(@Param("slug") slug: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo");
    }

    const game = await this.prisma.games.findUnique({ where: { slug } });
    if (!game) {
      throw new BadRequestException("Juego no encontrado");
    }

    const upload = await this.handleUpload(file, "covers");
    await this.prisma.games.update({ where: { id: game.id }, data: { cover_url: upload.url } });
    return upload;
  }

  @Post("games/:slug/media/image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiCookieAuth("access_token")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Subir imagen a la galeria de un juego" })
  async uploadGameImage(
    @Param("slug") slug: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Debes adjuntar un archivo");
    }

    const game = await this.prisma.games.findUnique({ where: { slug } });
    if (!game) {
      throw new BadRequestException("Juego no encontrado");
    }

    const upload = await this.handleUpload(file, "game-media");
    await this.prisma.game_media.create({
      data: {
        game_id: game.id,
        user_id: user.sub,
        type: "image",
        url: upload.url,
        provider: upload.provider,
        provider_id: upload.providerId,
      },
    });

    return upload;
  }

  private async handleUpload(file: Express.Multer.File, folder: string) {
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("El archivo debe ser una imagen");
    }

    if (file.size > this.uploadsService.maxFileSize) {
      throw new BadRequestException("El archivo supera el limite de 5MB");
    }

    return this.uploadsService.handleUpload(file, folder);
  }
}
