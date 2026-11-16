import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { randomUUID } from 'crypto';
import { QueryHoldingsDto } from './dto/query-holdings.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';

/*
@nestjs/common: Brings in tools we need to throw errors ie "Not Found" & mark the class as Injectable
PrismaService: This is your connection to the database.
CreateHoldingDto: The shape of the data coming from the frontend when they create a holding.
QueryHoldingsDto: The shape of the filters for when they list holdings.
randomUUID: A tool to generate unique IDs for new database rows.
*/

// Class setup OR The container
@Injectable()
export class HoldingsService {
  constructor(private prisma: PrismaService) {}

  // (i) Method 1. create(userId, dto) - Create the holdings
  async create(userId: string, dto: CreateHoldingDto) {
    // ============================================================
    // 1. Verify the container belongs to the user
    // ============================================================
    const container = await this.prisma.container.findFirst({
      where: { id: dto.containerId, userId },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    // ============================================================
    // 2. Verify it's an INVESTMENT container
    // ============================================================
    if (container.type !== 'INVESTMENT') {
      throw new BadRequestException('Holdings can only be created in INVESTMENT containers');
    }

    // ============================================================
    // 3. Verify the account exists, belongs to the user,
    // and is in the same container
    // ============================================================
    const account = await this.prisma.account.findFirst({
      where: {
        id: dto.accountId,
        userId,
        containerId: dto.containerId,
        deletedAt: null,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found in this container');
    }

    // ============================================================
    // 4. Create the holding
    // ============================================================
    return this.prisma.holding.create({
      data: {
        id: randomUUID(),
        userId,
        containerId: dto.containerId,
        accountId: dto.accountId,
        name: dto.name,
        assetClass: dto.assetClass,
        symbol: dto.symbol,
        quantity: dto.quantity,
        costBasisTotal: dto.costBasisTotal,
        currentValueTotal: dto.currentValueTotal,
        currency: dto.currency,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : null,
        pricingMode: dto.pricingMode ?? 'MANUAL',
        notes: dto.notes,
        status: 'OPEN',
      },
    });
  }

  // (ii) Method 2. findAll(userId, query)
  async findAll(userId: string, query: QueryHoldingsDto) {
    return this.prisma.holding.findMany({
      where: {
        userId,
        deletedAt: null,

        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.assetClass ? { assetClass: query.assetClass } : {}),
        ...(query.status ? { status: query.status } : { status: 'OPEN' }),

        ...(query.search
          ? {
              OR: [
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  symbol: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      // Include the container name for frontend display
      include: {
        container: {
          select: { name: true },
        },
      },

      // Newest holdings first
      orderBy: { createdAt: 'desc' },
    });
  }

  // (iii) Method 3. findOne(userId, id)
  async findOne(userId: string, id: string) {
    const holding = await this.prisma.holding.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },

      // Include the container name for display
      include: {
        container: {
          select: { name: true },
        },
      },
    });

    if (!holding) {
      throw new NotFoundException('Holding not found');
    }

    return holding;
  }

  // (iv) Method 4. update(userId, id, dto)
  async update(userId: string, id: string, dto: UpdateHoldingDto) {
    // 1. Verify ownership
    await this.findOne(userId, id);

    // 2. Apply the updates
    return this.prisma.holding.update({
      where: { id },
      data: {
        name: dto.name,
        costBasisTotal: dto.costBasisTotal,
        currentValueTotal: dto.currentValueTotal,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  // (v) Method 5. remove(userId, id)
  async remove(userId: string, id: string) {
    // 1. Verify ownership
    await this.findOne(userId, id);

    // 2. Soft delete
    return this.prisma.holding.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });
  }

  // (vi) Method 6. getSummary(userId, query)
  async getSummary(userId: string, query: QueryHoldingsDto) {
    // 1. Fetch all OPEN holdings that match the filters
    const holdings = await this.prisma.holding.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'OPEN',
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.assetClass ? { assetClass: query.assetClass } : {}),
      },
    });

    // 2. Sum cost basis and current value across all holdings
    const totalCostBasis = holdings.reduce((sum, h) => sum + Number(h.costBasisTotal), 0);

    const totalCurrentValue = holdings.reduce((sum, h) => sum + Number(h.currentValueTotal), 0);

    // 3. Unrealized gain = current value - cost basis
    const unrealizedGain = totalCurrentValue - totalCostBasis;

    // 4. Group holdings by asset class
    const byAssetClass: Record<string, number> = {};

    for (const holding of holdings) {
      byAssetClass[holding.assetClass] = (byAssetClass[holding.assetClass] ?? 0) + 1;
    }

    // 5. Return the summary
    return {
      count: holdings.length,
      totalCostBasis,
      totalCurrentValue,
      unrealizedGain,
      byAssetClass,
    };
  }

  // (vii) Method 7. getAllocation(userId, query)
  async getAllocation(userId: string, query: QueryHoldingsDto) {
    // 1. Fetch all OPEN holdings matching filters
    const holdings = await this.prisma.holding.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'OPEN',
        ...(query.containerId ? { containerId: query.containerId } : {}),
      },
    });

    // 2. Group by asset class
    const groups = new Map<string, { value: number; count: number }>();

    for (const holding of holdings) {
      const current = groups.get(holding.assetClass) ?? {
        value: 0,
        count: 0,
      };

      current.value += Number(holding.currentValueTotal);
      current.count += 1;

      groups.set(holding.assetClass, current);
    }

    // 3. Total across all holdings
    const totalValue = Array.from(groups.values()).reduce((sum, group) => sum + group.value, 0);

    // 4. Build the breakdown array sorted by value descending
    const breakdown = Array.from(groups.entries())
      .map(([assetClass, data]) => ({
        assetClass,
        value: data.value,
        percentage: totalValue === 0 ? 0 : Math.round((data.value / totalValue) * 1000) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    // 5. Currency — use the first holding's currency, or default to KES
    const currency = holdings[0]?.currency ?? 'KES';

    return {
      totalValue,
      currency,
      breakdown,
    };
  }
}
