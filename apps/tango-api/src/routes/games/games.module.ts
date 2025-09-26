import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { GenresController } from './genres.controller';
import { PlatformsController } from './platforms.controller';

@Module({
  imports: [AuthModule],
  providers: [GamesService],
  controllers: [GamesController, GenresController, PlatformsController],
})
export class GamesModule {}