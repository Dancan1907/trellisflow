import { Test } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlphaVantageProvider } from './alpha-vantage.provider';
import { FinnhubProvider } from './finnhub.provider';
import { CoinGeckoProvider } from './coingecko.provider';

const mockPrisma = {
  holding: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
};

const mockAlpha = { name: 'alpha_vantage', supports: jest.fn(), fetchPrice: jest.fn() };
const mockFinnhub = { name: 'finnhub', supports: jest.fn(), fetchPrice: jest.fn() };
const mockCoinGecko = { name: 'coingecko', supports: jest.fn(), fetchPrice: jest.fn() };

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlphaVantageProvider, useValue: mockAlpha },
        { provide: FinnhubProvider, useValue: mockFinnhub },
        { provide: CoinGeckoProvider, useValue: mockCoinGecko },
      ],
    }).compile();
    service = moduleRef.get(PricingService);
  });

  const stockHolding = {
    id: 'h1',
    assetClass: 'STOCK',
    quantity: '10',
    providerSymbol: 'AAPL',
    priceProvider: null,
    pricingMode: 'AUTO',
    status: 'OPEN',
    deletedAt: null,
  };

  it('updates the holding when a provider succeeds', async () => {
    mockPrisma.holding.findFirst.mockResolvedValue(stockHolding);
    mockAlpha.supports.mockReturnValue(true);
    mockFinnhub.supports.mockReturnValue(true);
    mockAlpha.fetchPrice.mockResolvedValue({
      price: 200,
      currency: 'USD',
      provider: 'alpha_vantage',
      fetchedAt: new Date(),
    });
    mockPrisma.holding.update.mockResolvedValue({});

    const result = await service.refreshHolding('h1');

    expect(result.updated).toBe(true);
    expect(mockPrisma.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentValueTotal: 2000, // 10 units × 200
          priceProvider: 'alpha_vantage',
        }),
      }),
    );
  });

  it('falls back to finnhub when alpha_vantage fails', async () => {
    mockPrisma.holding.findFirst.mockResolvedValue(stockHolding);
    mockAlpha.supports.mockReturnValue(true);
    mockFinnhub.supports.mockReturnValue(true);
    mockAlpha.fetchPrice.mockRejectedValue(new Error('rate limited'));
    mockFinnhub.fetchPrice.mockResolvedValue({
      price: 201,
      currency: 'USD',
      provider: 'finnhub',
      fetchedAt: new Date(),
    });
    mockPrisma.holding.update.mockResolvedValue({});

    const result = await service.refreshHolding('h1');

    expect(result.updated).toBe(true);
    expect(mockPrisma.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priceProvider: 'finnhub' }),
      }),
    );
  });

  it('returns updated:false when all providers fail', async () => {
    mockPrisma.holding.findFirst.mockResolvedValue(stockHolding);
    mockAlpha.supports.mockReturnValue(true);
    mockFinnhub.supports.mockReturnValue(true);
    mockAlpha.fetchPrice.mockRejectedValue(new Error('fail'));
    mockFinnhub.fetchPrice.mockRejectedValue(new Error('fail'));

    const result = await service.refreshHolding('h1');

    expect(result.updated).toBe(false);
    expect(mockPrisma.holding.update).not.toHaveBeenCalled();
  });

  it('does not refresh a MANUAL holding', async () => {
    mockPrisma.holding.findFirst.mockResolvedValue(null); // query filters AUTO
    const result = await service.refreshHolding('h1');
    expect(result.updated).toBe(false);
  });
});
