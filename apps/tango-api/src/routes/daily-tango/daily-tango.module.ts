import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DailyTangoController } from './daily-tango.controller';
import { DailyTangoService } from './daily-tango.service';

@Module({
  imports: [AuthModule],
  controllers: [DailyTangoController],
  providers: [DailyTangoService],
  exports: [DailyTangoService],
})
export class DailyTangoModule {}
