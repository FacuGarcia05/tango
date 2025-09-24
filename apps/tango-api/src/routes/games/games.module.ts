import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GenresController } from './genres.controller';
import { PlatformsController } from './platforms.controller';

@Module({
  providers: [GamesService],
  controllers: [GamesController, GenresController, PlatformsController],
})
export class GamesModule {}
