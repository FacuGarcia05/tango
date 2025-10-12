import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './routes/auth/auth.module';
import { GamesModule } from './routes/games/games.module';
import { RatingsModule } from './routes/ratings/ratings.module';
import { ReviewsModule } from './routes/reviews/reviews.module';
import { UsersModule } from './routes/users/users.module';
import { MediaModule } from './routes/media/media.module';
import { RawgModule } from './integrations/rawg/rawg.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GamesModule,
    AuthModule,
    ReviewsModule,
    RatingsModule,
    UsersModule,
    MediaModule,
    RawgModule,
  ],
})
export class AppModule {}
