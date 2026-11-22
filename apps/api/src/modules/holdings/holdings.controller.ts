import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HoldingsService } from './holdings.service';
import { PricingService } from './pricing/pricing.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryHoldingsDto } from './dto/query-holdings.dto';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';
import { SetPricingDto } from './dto/set-pricing.dto';

@ApiTags('holdings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('holdings')
export class HoldingsController {
  constructor(
    private readonly holdingsService: HoldingsService,
    private readonly pricingService: PricingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all holdings' })
  async findAll(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.findAll(user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated summary of open holdings' })
  async getSummary(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.getSummary(user.id, query);
  }

  @Get('allocation')
  @ApiOperation({ summary: 'Get portfolio allocation by asset class' })
  async getAllocation(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.getAllocation(user.id, query);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get net worth performance over time' })
  async getPerformance(@CurrentUser() user: any, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.holdingsService.getPerformance(user.id, daysNum);
  }

  @Post('refresh-prices')
  @ApiOperation({ summary: 'Refresh all AUTO holdings for the current user' })
  async refreshAllPrices(@CurrentUser() user: any) {
    return this.pricingService.refreshAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new holding' })
  async create(@CurrentUser() user: any, @Body() dto: CreateHoldingDto) {
    return this.holdingsService.create(user.id, dto);
  }

  @Patch(':id/pricing')
  @ApiOperation({ summary: 'Toggle MANUAL/AUTO pricing and set provider symbol' })
  async setPricing(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SetPricingDto) {
    return this.holdingsService.setPricing(user.id, id, dto);
  }

  @Post(':id/refresh-price')
  @ApiOperation({ summary: 'Refresh price for one holding (AUTO only)' })
  async refreshPrice(@CurrentUser() user: any, @Param('id') id: string) {
    await this.holdingsService.findOne(user.id, id);
    return this.pricingService.refreshHolding(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single holding by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.holdingsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a holding' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateHoldingDto) {
    return this.holdingsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a holding' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.holdingsService.remove(user.id, id);
  }
}
