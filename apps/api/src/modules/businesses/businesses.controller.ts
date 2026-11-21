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
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { QueryPnlDto } from './dto/query-pnl.dto';
import { ConvertToExternalDto } from './dto/convert-to-external.dto';

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

  @Get(':id/net-worth')
  @ApiOperation({ summary: 'Get assets, liabilities, and net worth for a business' })
  async getNetWorth(@CurrentUser() user: any, @Param('id') id: string) {
    return this.businessesService.getNetWorth(user.id, id);
  }

  @Get(':id/pnl')
  @ApiOperation({ summary: 'Get profit & loss for a business over a date range' })
  async getPnl(@CurrentUser() user: any, @Param('id') id: string, @Query() query: QueryPnlDto) {
    return this.businessesService.getPnl(user.id, id, query);
  }

  @Get(':id/runway')
  @ApiOperation({ summary: 'Get cash runway in months for a business' })
  async getRunway(@CurrentUser() user: any, @Param('id') id: string) {
    return this.businessesService.getRunway(user.id, id);
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

  @Post(':id/convert-to-external')
  @ApiOperation({
    summary: 'Convert an internal business to an external business (one-way)',
    description:
      "Keeps historical net worth snapshots intact. Archives internal accounts, seeds a Summary from today's internal net worth, and disables P&L/runway.",
  })
  async convertToExternal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ConvertToExternalDto,
  ) {
    return this.businessesService.convertToExternal(user.id, id, dto);
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
