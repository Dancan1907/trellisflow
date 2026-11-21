import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DebtsService } from './debts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDebtPlanDto } from './dto/create-debt-plan.dto';
import { SimulateDebtDto } from './dto/simulate-debt.dto';

/* eslint-disable @typescript-eslint/no-explicit-any */
@ApiTags('debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  @ApiOperation({ summary: 'List all debt payoff plans' })
  async findAll(@CurrentUser() user: any) {
    return this.debtsService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new debt to the planner' })
  async create(@CurrentUser() user: any, @Body() dto: CreateDebtPlanDto) {
    return this.debtsService.create(user.id, dto);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Run a Snowball/Avalanche simulation' })
  async simulate(@CurrentUser() user: any, @Body() dto: SimulateDebtDto) {
    return this.debtsService.simulate(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a debt from the planner' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.debtsService.remove(user.id, id);
  }
}
