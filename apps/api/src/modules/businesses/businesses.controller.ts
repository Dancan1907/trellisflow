/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @ApiOperation({ summary: 'List all internal businesses for the current user' })
  async findAll(@CurrentUser() user: any) {
    return this.businessesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single business with its profile' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.businessesService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new internal business' })
  async create(@CurrentUser() user: any, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a business name or profile' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a business' })
  async archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.businessesService.archive(user.id, id);
  }
}
