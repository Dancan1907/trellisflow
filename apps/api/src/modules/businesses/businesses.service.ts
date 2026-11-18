import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { randomUUID } from 'crypto';
import { DEFAULT_BUSINESS_CATEGORIES } from '../../common/constants/default-business-categories';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    // 1. Verify user exists (sanity check — JwtAuthGuard already does this, but defensive)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Validate currency (must be 3-letter ISO)
    if (dto.currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }

    // 3. Create everything in a single transaction
    return this.prisma.$transaction(async (tx) => {
      const containerId = randomUUID();
      const profileId = randomUUID();

      // 3a. Create the container
      const container = await tx.container.create({
        data: {
          id: containerId,
          userId,
          type: 'INTERNAL_BUSINESS',
          name: dto.name,
          currency: dto.currency.toUpperCase(),
          status: 'ACTIVE',
        },
      });

      // 3b. Create the business profile
      const profile = await tx.businessProfile.create({
        data: {
          id: profileId,
          containerId,
          businessType: dto.businessType,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          notes: dto.notes ?? null,
          logoUrl: dto.logoUrl ?? null,
        },
      });

      // 3c. Create default categories
      const categoryIds: string[] = [];
      for (const cat of DEFAULT_BUSINESS_CATEGORIES) {
        const categoryId = randomUUID();
        categoryIds.push(categoryId);
        await tx.category.create({
          data: {
            id: categoryId,
            userId,
            containerId,
            name: cat.name,
            type: cat.type,
            icon: cat.icon,
            isSystem: true,
            status: 'ACTIVE',
          },
        });
      }

      // 3d. Return the assembled business
      return {
        id: container.id,
        name: container.name,
        type: container.type,
        currency: container.currency,
        status: container.status,
        createdAt: container.createdAt,
        businessProfile: {
          id: profile.id,
          businessType: profile.businessType,
          startDate: profile.startDate,
          notes: profile.notes,
          logoUrl: profile.logoUrl,
        },
        categoriesCreated: categoryIds.length,
      };
    });
  }

  async findAll(userId: string) {
    throw new Error('Not implemented yet');
  }

  async findOne(userId: string, id: string) {
    throw new Error('Not implemented yet');
  }

  async update(userId: string, id: string, dto: UpdateBusinessDto) {
    throw new Error('Not implemented yet');
  }

  async archive(userId: string, id: string) {
    throw new Error('Not implemented yet');
  }
}
