// ============================================================================
// Containers Service
// ============================================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import { randomUUID } from 'crypto';
import { ContainerType } from '@prisma/client';

@Injectable()
export class ContainersService {
  constructor(private prisma: PrismaService) {}

  /**
   * List active containers for the user, with an optional flag to include archived ones.
   */
  async findAllForUser(userId: string, includeArchived: boolean = false) {
    return this.prisma.container.findMany({
      where: {
        userId,
        status: includeArchived ? { in: ['ACTIVE', 'ARCHIVED'] } : 'ACTIVE',
      },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a single container by ID, ensuring it belongs to the user.
   */
  async findOne(userId: string, id: string) {
    const container = await this.prisma.container.findFirst({
      where: { id, userId, status: { not: 'DELETED' } },
      include: { accounts: true },
    });

    if (!container) {
      throw new NotFoundException('Container not found');
    }

    return container;
  }

  /**
   * Create a new container (Business or Investment).
   */
  async create(userId: string, dto: CreateContainerDto) {
    // 1. Check if the user already has a container with this name
    const existing = await this.prisma.container.findFirst({
      where: { userId, name: dto.name, status: { not: 'DELETED' } },
    });

    if (existing) {
      throw new ConflictException('You already have a container with this name');
    }

    // 2. Personal containers cannot be created via the API.
    // The system creates exactly one on signup.
    if (dto.type === ContainerType.PERSONAL) {
      throw new ConflictException('Cannot manually create a Personal container');
    }

    // 3. Create it
    return this.prisma.container.create({
      data: {
        id: randomUUID(),
        userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Update a container's name.
   */
  async update(userId: string, id: string, dto: UpdateContainerDto) {
    // Verify ownership first
    await this.findOne(userId, id);

    return this.prisma.container.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  /**
   * Archive a container (soft delete).
   */
  async archive(userId: string, id: string) {
    const container = await this.findOne(userId, id);

    // Prevent archiving the Personal container
    if (container.type === ContainerType.PERSONAL) {
      throw new ConflictException('The Personal container cannot be archived');
    }

    return this.prisma.container.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
  }

  async getBusinessProfile(userId: string, containerId: string) {
    const container = await this.findOne(userId, containerId);

    const profile = await this.prisma.businessProfile.findUnique({
      where: { containerId: container.id },
    });

    if (!profile) {
      throw new NotFoundException('This container has no business profile');
    }

    return profile;
  }

  async createBusinessProfile(userId: string, containerId: string, dto: CreateBusinessProfileDto) {
    const container = await this.findOne(userId, containerId);

    // Only business containers can have profiles
    if (container.type !== 'INTERNAL_BUSINESS' && container.type !== 'EXTERNAL_BUSINESS') {
      throw new ConflictException('Only business containers can have a business profile');
    }

    // Check if profile already exists
    const existing = await this.prisma.businessProfile.findUnique({
      where: { containerId: container.id },
    });

    if (existing) {
      throw new ConflictException('This container already has a business profile');
    }

    return this.prisma.businessProfile.create({
      data: {
        id: randomUUID(),
        containerId: container.id,
        businessType: dto.businessType,
        businessTypeCustom: dto.businessTypeCustom,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        notes: dto.notes,
      },
    });
  }
}
