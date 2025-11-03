import { Module } from '@nestjs/common';

import { ActivityModule } from '../../common/activity/activity.module';
import { JwtOptionalAuthGuard } from '../auth/jwt-optional.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ActivityModule],
  providers: [UsersService, JwtOptionalAuthGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
