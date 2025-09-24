import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GamesService } from './games.service';

@ApiTags('Platforms')
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  list() {
    return this.gamesService.listPlatforms();
  }
}
