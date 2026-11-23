import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlphaVantageProvider } from './alpha-vantage.provider';
import { FinnhubProvider } from './finnhub.provider';
import { CoinGeckoProvider } from './coingecko.provider';
import { PriceProvider, PriceQuote } from './pricing.types';

const STOCK_PROVIDER_ORDER = ['alpha_vantage', 'finnhub'];

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly providers: PriceProvider[];

  constructor(
    private prisma: PrismaService,
    alpha: AlphaVantageProvider,
    finnhub: FinnhubProvider,
    coingecko: CoinGeckoProvider,
  ) {
    this.providers = [alpha, finnhub, coingecko];
  }

  /**
   * Refresh a single holding. Returns the new price (if any) and whether it was updated.
   * NEVER throws — callers get a structured result so the cron job can be resilient.
   */
  async refreshHolding(holdingId: string): Promise<{
    updated: boolean;
    price?: number;
    provider?: string;
    error?: string;
  }> {
    const holding = await this.prisma.holding.findFirst({
      where: { id: holdingId, pricingMode: 'AUTO', status: 'OPEN', deletedAt: null },
    });
    if (!holding) return { updated: false, error: 'Holding not found or not AUTO' };

    if (!holding.providerSymbol) {
      return { updated: false, error: 'providerSymbol not set' };
    }

    const quote = await this.fetchQuote(
      holding.assetClass,
      holding.providerSymbol,
      holding.priceProvider ?? undefined,
    );
    if (!quote) {
      return { updated: false, error: 'All providers failed' };
    }

    const newValue = Number(holding.quantity) * quote.price;

    await this.prisma.holding.update({
      where: { id: holding.id },
      data: {
        currentValueTotal: newValue,
        priceProvider: quote.provider,
        lastPricedAt: quote.fetchedAt,
      },
    });

    return { updated: true, price: quote.price, provider: quote.provider };
  }

  /**
   * Refresh all AUTO holdings for one user (or all users if userId omitted).
   * Bounded concurrency — 5 in parallel per provider to respect free-tier limits.
   */
  async refreshAll(
    userId?: string,
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const holdings = await this.prisma.holding.findMany({
      where: {
        pricingMode: 'AUTO',
        status: 'OPEN',
        deletedAt: null,
        ...(userId ? { userId } : {}),
      },
      select: { id: true },
    });

    let succeeded = 0;
    let failed = 0;

    // Simple in-process concurrency limit; free tiers are tight, so 5 is safe.
    const BATCH = 5;
    for (let i = 0; i < holdings.length; i += BATCH) {
      const batch = holdings.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map((h) => this.refreshHolding(h.id)));
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.updated) succeeded++;
        else failed++;
      }
    }

    this.logger.log(`Pricing refresh: ${succeeded}/${holdings.length} succeeded, ${failed} failed`);
    return { processed: holdings.length, succeeded, failed };
  }

  private async fetchQuote(
    assetClass: string,
    providerSymbol: string,
    preferredProvider?: string,
  ): Promise<PriceQuote | null> {
    // Build the provider chain based on asset class
    let chain = this.providers.filter((p) => p.supports(assetClass));
    if (chain.length === 0) {
      this.logger.warn(`No provider supports asset class ${assetClass}`);
      return null;
    }

    // If user selected a preferred provider and it's in the chain, put it first
    if (preferredProvider) {
      chain = [
        ...chain.filter((p) => p.name === preferredProvider),
        ...chain.filter((p) => p.name !== preferredProvider),
      ];
    } else if (assetClass === 'STOCK' || assetClass === 'ETF') {
      // Default stock order: Alpha Vantage → Finnhub
      chain = [
        ...chain.filter((p) => p.name === STOCK_PROVIDER_ORDER[0]),
        ...chain.filter((p) => p.name === STOCK_PROVIDER_ORDER[1]),
        ...chain.filter((p) => !STOCK_PROVIDER_ORDER.includes(p.name)),
      ];
    }

    for (const provider of chain) {
      try {
        const quote = await provider.fetchPrice(providerSymbol);
        return quote;
      } catch (err) {
        this.logger.warn(
          `${provider.name} failed for ${providerSymbol}: ${(err as Error).message}`,
        );
        // continue to next provider
      }
    }

    return null;
  }
}
