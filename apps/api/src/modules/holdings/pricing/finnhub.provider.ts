import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceProvider, PriceQuote } from './pricing.types';

@Injectable()
export class FinnhubProvider implements PriceProvider {
  readonly name = 'finnhub';
  private readonly logger = new Logger(FinnhubProvider.name);
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('FINNHUB_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('FINNHUB_API_KEY missing — provider will be skipped');
    }
  }

  supports(assetClass: string): boolean {
    return assetClass === 'STOCK' || assetClass === 'ETF';
  }

  async fetchPrice(symbol: string): Promise<PriceQuote> {
    if (!this.apiKey) throw new Error('Finnhub API key not configured');

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol,
    )}&token=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);

    const data = (await res.json()) as { c?: number; error?: string };
    if (data.error) throw new Error(`Finnhub: ${data.error}`);
    if (!data.c || data.c <= 0) throw new Error(`Finnhub: no price for ${symbol}`);

    return {
      price: data.c,
      currency: 'USD',
      provider: this.name,
      fetchedAt: new Date(),
    };
  }
}
