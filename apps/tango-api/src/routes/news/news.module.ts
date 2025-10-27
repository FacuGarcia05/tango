import { Module } from '@nestjs/common';

import { IsAdminGuard } from '../../common/guards/is-admin.guard';
import { AuthModule } from '../auth/auth.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [AuthModule],
  controllers: [NewsController],
  providers: [NewsService, IsAdminGuard],
})
export class NewsModule {}
