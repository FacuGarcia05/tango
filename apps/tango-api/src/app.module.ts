import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './routes/games/games.module';
import { AuthModule } from './routes/auth/auth.module';
import { ReviewsModule } from './routes/reviews/reviews.module';
import { RatingsModule } from './routes/ratings/ratings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GamesModule,
    AuthModule,
    ReviewsModule,
    RatingsModule,
  ],
})
export class AppModule {}
//a
