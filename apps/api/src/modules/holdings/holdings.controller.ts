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

@ApiTags('holdings') // Group these endpoints under holdings in Swagger UI
@ApiBearerAuth() // Tell swagger "this endpoint needs a JWT token" so the "Authorize" button appears
@UseGuards(JwtAuthGuard) // Means every method requires a valid JWT
@Controller('holdings') // Set the base path
export class HoldingsController {
  // Inject the Service
  constructor(private readonly holdingsService: HoldingsService) {}

  @Get() // Register this as GET /api/holdings
  @ApiOperation({ summary: 'List all holdings' }) // Adds a description to Swagger
  async findAll(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.findAll(user.id, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated summary of open holdings' })
  async getSummary(@CurrentUser() user: any, @Query() query: QueryHoldingsDto) {
    return this.holdingsService.getSummary(user.id, query);
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
