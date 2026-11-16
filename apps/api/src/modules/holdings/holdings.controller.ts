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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryHoldingsDto } from './dto/query-holdings.dto';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';

@ApiTags('holdings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('holdings')
export class HoldingsController {
  constructor(private readonly holdingsService: HoldingsService) {}

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

  @Post()
  @ApiOperation({ summary: 'Create a new holding' })
  async create(@CurrentUser() user: any, @Body() dto: CreateHoldingDto) {
    return this.holdingsService.create(user.id, dto);
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
