// ============================================================================
// Containers Controller
// ============================================================================

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContainersService } from './containers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContainerDto } from './dto/create-container.dto';
import { UpdateContainerDto } from './dto/update-container.dto';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';

@ApiTags('containers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('containers')
export class ContainersController {
  constructor(private readonly containersService: ContainersService) {}

  @Get()
  @ApiOperation({ summary: 'List all containers for the current user' })
  async findAll(@CurrentUser() user: any) {
    return this.containersService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single container by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.containersService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new container' })
  async create(@CurrentUser() user: any, @Body() dto: CreateContainerDto) {
    return this.containersService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a container name' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateContainerDto) {
    return this.containersService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a container' })
  async archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.containersService.archive(user.id, id);
  }

  @Get(':id/business-profile')
  @ApiOperation({ summary: 'Get the business profile for a container' })
  async getBusinessProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.containersService.getBusinessProfile(user.id, id);
  }

  @Post(':id/business-profile')
  @ApiOperation({ summary: 'Create a business profile for a container' })
  async createBusinessProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateBusinessProfileDto,
  ) {
    return this.containersService.createBusinessProfile(user.id, id, dto);
  }
}
