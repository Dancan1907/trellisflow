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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.currency.length !== 3) {
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const containerId = randomUUID();
          const profileId = randomUUID();

          // 1. Create the container
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

          // 2. Create the business profile
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

          // 3. Create ALL categories in ONE query (fixes the 500 timeout error)
          await tx.category.createMany({
            data: DEFAULT_BUSINESS_CATEGORIES.map((cat) => ({
              id: randomUUID(),
              userId,
              containerId,
              name: cat.name,
              type: cat.type,
              icon: cat.icon,
              isSystem: true,
              status: 'ACTIVE',
            })),
          });

          // 4. Return the assembled response
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
            categoriesCreated: DEFAULT_BUSINESS_CATEGORIES.length,
          };
        },
        { timeout: 15000 }, // 15s timeout instead of default 5s
      );
    } catch (error) {
      console.error('[BusinessesService.create] error:', error);
      throw error;
    }
  }

  async findAll(userId: string) {
    const containers = await this.prisma.container.findMany({
      where: { userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
      include: { businessProfile: true },
      orderBy: { createdAt: 'desc' },
    });

    return containers.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      currency: c.currency,
      status: c.status,
      createdAt: c.createdAt,
      businessProfile: c.businessProfile,
    }));
  }

  async findOne(userId: string, id: string) {
    const container = await this.prisma.container.findFirst({
      where: { id, userId, type: 'INTERNAL_BUSINESS', status: 'ACTIVE' },
      include: { businessProfile: true },
    });

    if (!container) {
      throw new NotFoundException('Business not found');
    }

    return {
      id: container.id,
      name: container.name,
      type: container.type,
      currency: container.currency,
      status: container.status,
      createdAt: container.createdAt,
      businessProfile: container.businessProfile,
    };
  }

  async update(userId: string, id: string, dto: UpdateBusinessDto) {
    throw new Error('Not implemented yet');
  }

  async archive(userId: string, id: string) {
    throw new Error('Not implemented yet');
  }
}
