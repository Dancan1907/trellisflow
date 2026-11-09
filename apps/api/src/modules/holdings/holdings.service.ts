import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { randomUUID } from 'crypto';

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
}
