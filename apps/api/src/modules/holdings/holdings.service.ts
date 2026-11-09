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

//Class setup OR The container
@Injectable() //Tells NestJs "this class can have things injected into it eg the Prisma Connection"
export class HoldingsService {
  // Define the class & export it so the Controller can use it .
  constructor(private prisma: PrismaService) {}
  /* 
   This is Dependency Injection. It says "Hey NestJS, whenever I need to talk to the database, 
   give me the PrismaService and I'll call it prisma."
  */

  // (i) Method 1. create(userId, dto)  Create the holdings
  async create(userId: string, dto: CreateHoldingDto) {
    // 1. Verify the container exists & belongs to this user
    const container = await this.prisma.container.findFirst({
      /* We look for the container. We pass userId to ensure it's their container (security). */
      where: {
        id: dto.containerId,
        userId,
      },
    });

    //If no container is found, we stop immediately and send a 404.
    if (!container) {
      throw new NotFoundException('Container not found');
    }

    // 2. Check if the container is an INVESTMENT container
    if (container.type !== 'INVESTMENT') {
      throw new BadRequestException('Holdings can only be created in INVESTMENT containers');
    }

    // 3. Create the holding in the database
    // We tell Prisma to save the new holding. We manually provide the id using randomUUID().
    return this.prisma.holding.create({
      data: {
        // Attach the random generated holding id & the users id..
        id: randomUUID(),
        userId,
        //All these fields should match the fields outlined in the CreateHoldingDto except status field
        containerId: dto.containerId,
        name: dto.name,
        assetClass: dto.assetClass,
        symbol: dto.symbol,
        quantity: dto.quantity,
        costBasisTotal: dto.costBasisTotal,
        currentValueTotal: dto.currentValueTotal,
        currency: dto.currency,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : null,
        // If the user provided a date, convert it from a string to a real Date object. If not, store null.
        pricingMode: dto.pricingMode ?? 'MANUAL', // Referred to enum PricingMode in Schema
        notes: dto.notes,
        status: 'OPEN', //Referred to the enum HoldingStatus in Schema
      },
    });
  }

  //(ii) Method 2 findAll(userId, query)
  async findAll(userId: string, query: QueryHoldingsDto) {
    // Ask the db for many holdings that match the filters
    return this.prisma.holding.findMany({
      /* findMany → Returns an array (could be empty, could be 100 items)
      return → Sends that array back to the controller, which sends it as JSON to the frontend */
      where: {
        userId, // Only return holdings that belong to this user
        deletedAt: null, // Skip soft-deleted holdings

        // Each of these spreads is optional — it only applies if the user sent that filter
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.assetClass ? { assetClass: query.assetClass } : {}),
        ...(query.status ? { status: query.status } : { status: 'OPEN' }), // Default to OPEN
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { symbol: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      // Include the container name so the frontend can display "Personal Investment"
      include: { container: { select: { name: true } } },
      // Newest holdings first
      orderBy: { createdAt: 'desc' },
    });
  }

  // (iii) findOne(userId, id) Get a specific one
  async findOne(userId: string, id: string) {
    // Ask the db for a single holding matching the id, user, and not soft-deleted
    const holding = await this.prisma.holding.findFirst({
      where: {
        id,
        userId, // Security: prevents users from reading other users' holdings
        deletedAt: null, // Skip soft-deleted
      },
      // Include the container name for display
      include: { container: { select: { name: true } } },
    });

    // If nothing came back, the holding doesn't exist (or isn't theirs)
    if (!holding) {
      throw new NotFoundException('Holding not found');
    }

    // Return the holding — it definitely exists now
    return holding;
  }

  // (iv) Method 4. update (userId, id, dto)
  async update(userId: string, id: string, dto: UpdateHoldingDto) {
    // 1. Verify ownership — throws NotFoundException if not owned/found
    await this.findOne(userId, id); //Call the findone method  to confirm ownership

    // 2. Apply the updates
    return this.prisma.holding.update({
      where: { id },
      data: {
        // Attach the field present in the UpdateHoldingDto
        name: dto.name,
        costBasisTotal: dto.costBasisTotal,
        currentValueTotal: dto.currentValueTotal,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  // (v) Method 5. remove
  async remove(userId: string, id: string) {
    // 1. Verify ownership — throws NotFoundException if not owned/found
    await this.findOne(userId, id);

    // 2. Soft delete: mark as DELETED, set deletedAt timestamp
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
        status: 'OPEN', // Only count holdings still held
        ...(query.containerId ? { containerId: query.containerId } : {}),
        ...(query.assetClass ? { assetClass: query.assetClass } : {}),
      },
    });

    // 2. Sum cost basis and current value across all holdings
    // We convert Prisma Decimals to JS numbers before adding
    const totalCostBasis = holdings.reduce((sum, h) => sum + Number(h.costBasisTotal), 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + Number(h.currentValueTotal), 0);

    // 3. Unrealized gain = current value - cost basis
    const unrealizedGain = totalCurrentValue - totalCostBasis;

    // 4. Group holdings by asset class (e.g., { STOCK: 3, CRYPTO: 1 })
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
}
