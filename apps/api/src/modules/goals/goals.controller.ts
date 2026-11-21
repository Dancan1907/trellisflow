import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';

/* eslint-disable @typescript-eslint/no-explicit-any */
@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'List all savings goals' })
  async findAll(@CurrentUser() user: any) {
    return this.goalsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single savings goal' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goalsService.findOne(user.id, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Cumulative progress history + projection (for charts)' })
  async getHistory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goalsService.getHistory(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new savings goal' })
  async create(@CurrentUser() user: any, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.id, dto);
  }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Add money to (or withdraw from) a manual goal' })
  async addContribution(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateContributionDto,
  ) {
    return this.goalsService.addContribution(user.id, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goalsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a savings goal' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.goalsService.remove(user.id, id);
  }
}
