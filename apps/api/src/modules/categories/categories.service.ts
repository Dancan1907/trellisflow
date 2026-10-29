// ============================================================================
// Categories Service
// ============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all categories for a user, optionally filtered by type (INCOME/EXPENSE).
   * Returns a tree structure if `flat` is false.
   */
  async findAllForUser(userId: string, type?: 'INCOME' | 'EXPENSE', flat: boolean = false) {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(type ? { type } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // If the user asks for a flat list, return as-is
    if (flat) {
      return categories;
    }

    // Otherwise, build a tree structure (parents → children)
    return this.buildTree(categories);
  }

  /**
   * Get a single category, ensuring it belongs to the user.
   */
  async findOne(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId, status: { not: 'DELETED' } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Create a new category.
   */
  async create(userId: string, dto: CreateCategoryDto) {
    // 1. If parentId is provided, verify it exists and belongs to the user
    if (dto.parentId) {
      await this.findOne(userId, dto.parentId);

      // Prevent nesting beyond one level
      const parent = await this.findOne(userId, dto.parentId);
      if (parent.parentId) {
        throw new BadRequestException('Categories can only be nested one level deep');
      }
    }

    // 2. Check for a duplicate name at the same level (same parent)
    const duplicate = await this.prisma.category.findFirst({
      where: {
        userId,
        name: dto.name,
        parentId: dto.parentId ?? null,
        status: 'ACTIVE',
      },
    });

    if (duplicate) {
      throw new ConflictException('A category with this name already exists at this level');
    }

    // 3. Create it
    return this.prisma.category.create({
      data: {
        id: randomUUID(),
        userId,
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: false,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Update a category (rename, icon, color, sort order).
   */
  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    // Verify ownership
    await this.findOne(userId, id);

    // If renaming, check for duplicates
    if (dto.name) {
      const existing = await this.findOne(userId, id);
      const duplicate = await this.prisma.category.findFirst({
        where: {
          userId,
          name: dto.name,
          parentId: existing.parentId,
          status: 'ACTIVE',
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException('Another category with this name exists at this level');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder,
      },
    });
  }

  /**
   * Archive a category (soft delete).
   */
  async archive(userId: string, id: string) {
    const category = await this.findOne(userId, id);

    // Prevent archiving system categories
    if (category.isSystem) {
      throw new ConflictException('System categories cannot be archived');
    }

    // If it has children, prevent archiving
    const children = await this.prisma.category.count({
      where: { parentId: id, status: 'ACTIVE' },
    });

    if (children > 0) {
      throw new ConflictException('Cannot archive a category with active subcategories');
    }

    return this.prisma.category.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });
  }

  /**
   * Reorder categories by updating their sortOrder.
   */
  async reorder(userId: string, orderedIds: string[]) {
    // Verify all IDs belong to the user
    const count = await this.prisma.category.count({
      where: { id: { in: orderedIds }, userId },
    });

    if (count !== orderedIds.length) {
      throw new BadRequestException('Some categories were not found or do not belong to you');
    }

    // Update sortOrder in a transaction
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { message: 'Categories reordered successfully' };
  }

  /**
   * Helper: Build a tree structure from a flat list.
   */
  private buildTree(categories: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // First pass: put every category in the map with an empty children array
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }

    // Second pass: assign each category to its parent's children array
    for (const cat of categories) {
      const node = map.get(cat.id);
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
