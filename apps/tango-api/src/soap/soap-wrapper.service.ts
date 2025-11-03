import { Injectable } from '@nestjs/common';
import { CheapSharkService } from './cheapshark.service';
import * as soap from 'soap';

@Injectable()
export class SoapWrapperService {
  private soapUrl = 'http://localhost:8081/wsdl?wsdl';

  constructor(private readonly cheapSharkService: CheapSharkService) {}

  async convertPrice(title: string, price: number, currency: string) {
    try {
      const client = await soap.createClientAsync(this.soapUrl);
      const [result] = await client.convertPriceAsync({
        title,
        priceUSD: price,
        targetCurrency: currency,
      });
      return result;
    } catch (error) {
      console.error('Error SOAP Wrapper:', error.message);
      throw new Error('Error al comunicarse con el servicio SOAP');
    }
  }

  async convertGameWithPrice(title: string, currency: string) {
    //Obtener el precio en USD desde CheapShark
  const steamPriceUSD = await this.cheapSharkService.getSteamPriceByTitle(title);

  if (steamPriceUSD === null) {
    return { error: `No se encontró precio en Steam para "${title}"` };
  }

  //Convertir con SOAP
  const conversion = await this.convertPrice(title, steamPriceUSD, currency);

  //Combinar todo
  return {
    title,
    store: 'Steam',
    basePriceUSD: steamPriceUSD,
    convertedPrice: conversion.convertedPrice,
    rate: conversion.rate,
    targetCurrency: currency,
  };
}
}
