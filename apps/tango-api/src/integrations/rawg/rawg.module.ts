import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../routes/auth/auth.module';
import { RawgAdminGuard } from './rawg-admin.guard';
import { RawgController } from './rawg.controller';
import { RawgService } from './rawg.service';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  providers: [RawgService, RawgAdminGuard],
  controllers: [RawgController],
  exports: [RawgService],
})
export class RawgModule {}
