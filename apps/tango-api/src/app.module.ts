import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { GamesModule } from './routes/games/games.module';
import { AuthModule } from './routes/auth/auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, GamesModule, AuthModule],
})
export class AppModule {}
//a