import { Module } from '@nestjs/common';

import { ActivityModule } from '../../common/activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [AuthModule, ActivityModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
