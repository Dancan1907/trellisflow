import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { randomUUID } from 'crypto';
import { DEFAULT_BUSINESS_CATEGORIES } from '../../common/constants/default-business-categories';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  // We will build these methods in the next steps
  async create(userId: string, dto: CreateBusinessDto) {
    throw new Error('Not implemented yet');
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
