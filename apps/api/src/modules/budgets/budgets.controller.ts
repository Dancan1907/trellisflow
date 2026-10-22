// ============================================================================
// Budgets Controller
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { QueryBudgetsDto } from './dto/query-budgets.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active budgets' })
  async findAll(@CurrentUser() user: any, @Query() query: QueryBudgetsDto) {
    return this.budgetsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.budgetsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  async create(@CurrentUser() user: any, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a budget' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.budgetsService.remove(user.id, id);
  }
}
