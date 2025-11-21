import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { GetGamesQueryDto } from './dto';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private service: GamesService) {}

  @Get()
  list(
    @Query() query: GetGamesQueryDto,
  ): Promise<{ total: number; items: unknown[] }> {
    return this.service.findMany(query);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string): Promise<unknown> {
    return this.service.findBySlug(slug);
  }

  @Get(':slug/dlcs')
  dlcs(@Param('slug') slug: string): Promise<unknown[]> {
    return this.service.findDlcsOf(slug);
  }

  @Get(':slug/media')
  media(@Param('slug') slug: string) {
    return this.service.listMediaBySlug(slug);
  }

  @Put(':slug/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  updateCover(@Param('slug') slug: string, @Body('url') url: string) {
    return this.service.setCoverBySlug(slug, url);
  }
}
