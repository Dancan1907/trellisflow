import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceProvider, PriceQuote } from './pricing.types';

@Injectable()
export class AlphaVantageProvider implements PriceProvider {
  readonly name = 'alpha_vantage';
  private readonly logger = new Logger(AlphaVantageProvider.name);
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('ALPHA_VANTAGE_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('ALPHA_VANTAGE_API_KEY missing — provider will be skipped');
    }
  }

  supports(assetClass: string): boolean {
    return assetClass === 'STOCK' || assetClass === 'ETF';
  }

  async fetchPrice(symbol: string): Promise<PriceQuote> {
    if (!this.apiKey) throw new Error('Alpha Vantage API key not configured');

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol,
    )}&apikey=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

    const data = (await res.json()) as {
      'Global Quote'?: { '05. price'?: string };
      Note?: string;
      Information?: string;
    };

    // Alpha Vantage returns { Note } or { Information } when rate-limited / invalid
    if (data.Note || data.Information) {
      throw new Error(`Alpha Vantage rate-limited: ${data.Note ?? data.Information}`);
    }

    const priceStr = data['Global Quote']?.['05. price'];
    if (!priceStr) throw new Error(`Alpha Vantage: no price for ${symbol}`);

    return {
      price: Number(priceStr),
      currency: 'USD', // Alpha Vantage returns USD; caller converts if holding.currency differs
      provider: this.name,
      fetchedAt: new Date(),
    };
  }
}
