import { Module } from '@nestjs/common';

import { ActivityModule } from '../../common/activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [AuthModule, ActivityModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
