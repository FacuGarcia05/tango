import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './routes/auth/auth.module';
import { GamesModule } from './routes/games/games.module';
import { ListsModule } from './routes/lists/lists.module';
import { FeedModule } from './routes/feed/feed.module';
import { NewsModule } from './routes/news/news.module';
import { RatingsModule } from './routes/ratings/ratings.module';
import { ReviewsModule } from './routes/reviews/reviews.module';
import { UsersModule } from './routes/users/users.module';
import { MediaModule } from './routes/media/media.module';
import { RawgModule } from './integrations/rawg/rawg.module';
import { BacklogModule } from './routes/backlog/backlog.module';
import { PartiesModule } from './routes/parties/parties.module';
import { DailyTangoModule } from './routes/daily-tango/daily-tango.module';

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
    ListsModule,
    BacklogModule,
    FeedModule,
    NewsModule,
    PartiesModule,
    DailyTangoModule,
  ],
})
export class AppModule {}
