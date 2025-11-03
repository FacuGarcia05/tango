import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CheapSharkService } from './cheapshark.service';
import { SoapWrapperService } from './soap-wrapper.service';
import { SoapWrapperController } from './soap-wrapper.controller';

@Module({
  imports: [HttpModule],
  controllers: [SoapWrapperController],
  providers: [CheapSharkService, SoapWrapperService],
  exports: [SoapWrapperService],
})
export class SoapModule {}
