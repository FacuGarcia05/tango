import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BacklogController } from './backlog.controller';
import { BacklogService } from './backlog.service';

@Module({
  imports: [AuthModule],
  controllers: [BacklogController],
  providers: [BacklogService],
  exports: [BacklogService],
})
export class BacklogModule {}
