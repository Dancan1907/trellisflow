import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceProvider, PriceQuote } from './pricing.types';

@Injectable()
export class CoinGeckoProvider implements PriceProvider {
  readonly name = 'coingecko';
  private readonly logger = new Logger(CoinGeckoProvider.name);
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('COINGECKO_API_KEY');
  }

  supports(assetClass: string): boolean {
    return assetClass === 'CRYPTO';
  }

  async fetchPrice(providerSymbol: string): Promise<PriceQuote> {
    // providerSymbol should be a CoinGecko id, e.g. "bitcoin", "ethereum"
    const base = 'https://api.coingecko.com/api/v3/simple/price';
    const params = new URLSearchParams({
      ids: providerSymbol,
      vs_currencies: 'usd',
    });
    if (this.apiKey) params.set('x_cg_demo_api_key', this.apiKey);

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = (await res.json()) as Record<string, { usd?: number }>;
    const price = data[providerSymbol]?.usd;
    if (!price) throw new Error(`CoinGecko: no price for ${providerSymbol}`);

    return {
      price,
      currency: 'USD',
      provider: this.name,
      fetchedAt: new Date(),
    };
  }
}
