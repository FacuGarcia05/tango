import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CheapSharkService {
  private baseUrl = 'https://www.cheapshark.com/api/1.0';

  constructor(private readonly http: HttpService) {}

  // Busca el juego por titulo y devuelve su ID
  private async getGameId(title: string): Promise<string | null> {
    const url = `${this.baseUrl}/games?title=${encodeURIComponent(title)}`;
    const response = await lastValueFrom(this.http.get(url));
    const data = response.data;

    if (Array.isArray(data) && data.length > 0) {
      return data[0].gameID;
    }
    return null;
  }

  // Busca el precio en Steam
  async getSteamPriceByTitle(title: string): Promise<number | null> {
    const gameId = await this.getGameId(title);
    if (!gameId) return null;

    const url = `${this.baseUrl}/games?id=${gameId}`;
    const response = await lastValueFrom(this.http.get(url));
    const data = response.data;

    if (!data.deals || !Array.isArray(data.deals)) return null;

    const steamDeal = data.deals.find((deal: any) => deal.storeID === '1'); // storeID=1 → Steam
    if (!steamDeal) return null;

    return parseFloat(steamDeal.price);
  }
}
