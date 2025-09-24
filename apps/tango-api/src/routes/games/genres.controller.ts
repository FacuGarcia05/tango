import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GamesService } from './games.service';

@ApiTags('Genres')
@Controller('genres')
export class GenresController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  list() {
    return this.gamesService.listGenres();
  }
}
