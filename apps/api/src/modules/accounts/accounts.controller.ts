// ============================================================================
// Accounts Controller
// ============================================================================

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active accounts' })
  async findAll(@CurrentUser() user: any) {
    return this.accountsService.findAllForUser(user.id);
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Get current net worth calculation' })
  async getNetWorth(@CurrentUser() user: any) {
    return this.accountsService.getNetWorth(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountsService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  async create(@CurrentUser() user: any, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive an account' })
  async archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountsService.archive(user.id, id);
  }
}
