/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvestmentEventsService } from './investment-events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { QueryInvestmentEventsDto } from './dto/query-investment-events.dto';

@ApiTags('investment-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investment-events')
export class InvestmentEventsController {
  constructor(private readonly investmentEventsService: InvestmentEventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all investment events' })
  async findAll(@CurrentUser() user: any, @Query() query: QueryInvestmentEventsDto) {
    return this.investmentEventsService.findAll(user.id, query);
  }

  @Get('by-holding/:holdingId')
  @ApiOperation({ summary: 'List all events for a specific holding' })
  async findByHolding(@CurrentUser() user: any, @Param('holdingId') holdingId: string) {
    return this.investmentEventsService.findByHolding(user.id, holdingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single investment event' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.investmentEventsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new investment event' })
  async create(@CurrentUser() user: any, @Body() dto: CreateInvestmentEventDto) {
    return this.investmentEventsService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an investment event (reverses the holding math)' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.investmentEventsService.remove(user.id, id);
  }
}
