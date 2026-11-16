import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { randomUUID } from 'crypto';
import { QueryInvestmentEventsDto } from './dto/query-investment-events.dto';

@Injectable()
export class InvestmentEventsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvestmentEventDto) {
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
    // 2. Fetch the holding (required for BUY, SELL, DIVIDEND)
    // ============================================================
    const needsHolding = ['BUY', 'SELL', 'DIVIDEND'].includes(dto.eventType);

    if (needsHolding && !dto.holdingId) {
      throw new BadRequestException(`${dto.eventType} events require a holdingId`);
    }

    let holding = null;
    if (needsHolding && dto.holdingId) {
      holding = await this.prisma.holding.findFirst({
        where: {
          id: dto.holdingId,
          userId,
          containerId: dto.containerId,
          deletedAt: null,
        },
      });

      if (!holding) {
        throw new NotFoundException('Holding not found in this container');
      }

      // ============================================================
      // 3. Validate BUY/SELL specific fields
      // ============================================================
      if (dto.eventType === 'BUY' || dto.eventType === 'SELL') {
        if (!dto.quantity || dto.quantity <= 0) {
          throw new BadRequestException(`${dto.eventType} events require a positive quantity`);
        }
      }

      // For SELL, ensure the holding has enough quantity
      if (dto.eventType === 'SELL') {
        const currentQuantity = Number(holding.quantity);
        if (dto.quantity! > currentQuantity) {
          throw new BadRequestException(
            `Cannot sell ${dto.quantity} units. Only ${currentQuantity} available.`,
          );
        }
      }
    }

    // ============================================================
    // 4. Validate chronological ordering (event date must be >= last event)
    // ============================================================
    const eventDate = new Date(dto.date);

    const lastEvent = await this.prisma.investmentEvent.findFirst({
      where: { userId, containerId: dto.containerId },
      orderBy: { date: 'desc' },
    });

    if (lastEvent && eventDate < lastEvent.date) {
      throw new BadRequestException(
        `Event date (${dto.date}) cannot be before the last event (${lastEvent.date.toISOString().split('T')[0]})`,
      );
    }

    // ============================================================
    // 5. Calculate the math (based on event type)
    // ============================================================
    // Initialize as "no changes"
    let newQuantity = Number(holding?.quantity ?? 0);
    let newCostBasisTotal = Number(holding?.costBasisTotal ?? 0);
    let newCurrentValueTotal = Number(holding?.currentValueTotal ?? 0);
    let realizedGain: number | null = null;
    let closingHolding = false;

    switch (dto.eventType) {
      case 'BUY': {
        newQuantity += dto.quantity!;
        newCostBasisTotal += dto.totalAmount;
        newCurrentValueTotal += dto.totalAmount;
        // realizedGain stays null
        break;
      }

      case 'SELL': {
        const currentQuantity = Number(holding!.quantity);
        const averageCostPerShare =
          currentQuantity === 0 ? 0 : Number(holding!.costBasisTotal) / currentQuantity;
        const costBasisToRemove = averageCostPerShare * dto.quantity!;

        newQuantity -= dto.quantity!;
        newCostBasisTotal -= costBasisToRemove;
        newCurrentValueTotal -= dto.totalAmount;

        realizedGain = dto.totalAmount - costBasisToRemove;

        // If we sold everything, close the holding
        if (newQuantity === 0) {
          closingHolding = true;
        }
        break;
      }

      case 'DIVIDEND': {
        // No change to holding. Dividend is realized income.
        realizedGain = dto.totalAmount;
        break;
      }

      case 'CONTRIBUTION':
      case 'WITHDRAWAL': {
        // Informational — no change to holding, no realized gain
        break;
      }

      default:
        throw new BadRequestException(`Unsupported event type: ${dto.eventType}`);
    }

    // ============================================================
    // 6. Execute atomically: update holding + create event
    // ============================================================
    return this.prisma.$transaction(async (tx) => {
      // 6a. If this event affected a holding, update it
      if (holding) {
        await tx.holding.update({
          where: { id: holding.id },
          data: {
            quantity: newQuantity,
            costBasisTotal: newCostBasisTotal,
            currentValueTotal: newCurrentValueTotal,
            ...(closingHolding ? { status: 'CLOSED', closedAt: new Date() } : {}),
          },
        });
      }

      // 6b. Create the event row
      return tx.investmentEvent.create({
        data: {
          id: randomUUID(),
          userId,
          containerId: dto.containerId,
          holdingId: dto.holdingId ?? null,
          eventType: dto.eventType,
          quantity: dto.quantity ?? null,
          pricePerUnit: dto.pricePerUnit ?? null,
          totalAmount: dto.totalAmount,
          currency: dto.currency,
          date: eventDate,
          realizedGain,
          notes: dto.notes,
        },
      });
    });
  }

  async findAll(userId: string, query: QueryInvestmentEventsDto) {
    return this.prisma.investmentEvent.findMany({
      where: {
        userId,
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.holdingId ? { holdingId: query.holdingId } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.search ? { notes: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      include: {
        holding: { select: { name: true, symbol: true } },
        container: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const event = await this.prisma.investmentEvent.findFirst({
      where: { id, userId },
      include: {
        holding: { select: { name: true, symbol: true, currency: true } },
        container: { select: { name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Investment event not found');
    }

    return event;
  }

  async findByHolding(userId: string, holdingId: string) {
    // First verify the holding belongs to the user
    const holding = await this.prisma.holding.findFirst({
      where: { id: holdingId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!holding) {
      throw new NotFoundException('Holding not found');
    }

    // Then return all events for it
    return this.prisma.investmentEvent.findMany({
      where: { userId, holdingId },
      orderBy: { date: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    // 1. Fetch the event
    const event = await this.findOne(userId, id);

    // 2. If it's the last event for the holding, reverse the math
    if (event.holdingId) {
      // Verify this is the most recent event for the holding
      const mostRecentEvent = await this.prisma.investmentEvent.findFirst({
        where: { userId, holdingId: event.holdingId },
        orderBy: { date: 'desc' },
      });

      if (mostRecentEvent && mostRecentEvent.id !== event.id) {
        throw new BadRequestException(
          'Can only delete the most recent event for this holding. Delete later events first.',
        );
      }

      // 3. Reverse the math
      const holding = await this.prisma.holding.findUnique({
        where: { id: event.holdingId },
      });

      if (holding) {
        let newQuantity = Number(holding.quantity);
        let newCostBasisTotal = Number(holding.costBasisTotal);
        let newCurrentValueTotal = Number(holding.currentValueTotal);
        let reopen = false;

        switch (event.eventType) {
          case 'BUY': {
            newQuantity -= Number(event.quantity ?? 0);
            newCostBasisTotal -= Number(event.totalAmount);
            newCurrentValueTotal -= Number(event.totalAmount);
            break;
          }

          case 'SELL': {
            // Reverse: add back the shares and the cost basis that was removed
            const reverseQuantity = Number(event.quantity ?? 0);
            const realizedGainAtEvent = Number(event.realizedGain ?? 0);
            // Cost basis that was removed = proceeds - realizedGain
            const costBasisToRestore = Number(event.totalAmount) - realizedGainAtEvent;

            newQuantity += reverseQuantity;
            newCostBasisTotal += costBasisToRestore;
            newCurrentValueTotal += Number(event.totalAmount);

            // If the holding was closed by this sale, reopen it
            if (holding.status === 'CLOSED') {
              reopen = true;
            }
            break;
          }

          case 'DIVIDEND':
          case 'CONTRIBUTION':
          case 'WITHDRAWAL': {
            // No math to reverse
            break;
          }
        }

        // 4. Update the holding + delete the event atomically
        return this.prisma.$transaction(async (tx) => {
          await tx.holding.update({
            where: { id: holding.id },
            data: {
              quantity: newQuantity,
              costBasisTotal: newCostBasisTotal,
              currentValueTotal: newCurrentValueTotal,
              ...(reopen ? { status: 'OPEN', closedAt: null } : {}),
            },
          });

          return tx.investmentEvent.delete({
            where: { id },
          });
        });
      }
    }

    // If no holding (CONTRIBUTION/WITHDRAWAL), just delete
    return this.prisma.investmentEvent.delete({
      where: { id },
    });
  }
}
