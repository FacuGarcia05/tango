import { Controller, Get, Param, Query } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private service: GamesService) {}

  @Get()
  list(@Query('q') q?: string, @Query('includeDlc') includeDlc?: string,
       @Query('take') take = '20', @Query('skip') skip = '0') {
    return this.service.findMany({ q, includeDlc: includeDlc === 'true', take: +take, skip: +skip });
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) { return this.service.findBySlug(slug); }

  @Get(':slug/dlcs')
  dlcs(@Param('slug') slug: string) { return this.service.findDlcsOf(slug); }
}
//a