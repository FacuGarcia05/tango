import { Controller, Get, Query } from '@nestjs/common';
import { SoapWrapperService } from './soap-wrapper.service';

@Controller('api/soap')
export class SoapWrapperController {
  constructor(private readonly soapWrapperService: SoapWrapperService) {}

  //Nuevo endpoint con CheapShark
  @Get('convert-with-price')
  async convertWithPrice(
    @Query('title') title: string,
    @Query('currency') currency: string,
  ) {
    if (!title || !currency) {
      return { error: 'Faltan parámetros (title, currency)' };
    }

    return this.soapWrapperService.convertGameWithPrice(title, currency);
  }
}
