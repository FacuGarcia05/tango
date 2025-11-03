import { Module } from '@nestjs/common';

import { ActivityModule } from '../../common/activity/activity.module';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [ActivityModule],
  providers: [RatingsService],
  controllers: [RatingsController],
})
export class RatingsModule {}
