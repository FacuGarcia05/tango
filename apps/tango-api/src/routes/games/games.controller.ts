import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';
import { GetGamesQueryDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Games')
@Controller('games')
export class GamesController {
  constructor(private service: GamesService) {}

  @Get()
  list(@Query() query: GetGamesQueryDto) {
    return this.service.findMany(query);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) { return this.service.findBySlug(slug); }

  @Get(':slug/dlcs')
  dlcs(@Param('slug') slug: string) { return this.service.findDlcsOf(slug); }
}
//a
