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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active categories for the user' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({
    name: 'flat',
    required: false,
    type: Boolean,
    description: 'Return flat list instead of tree',
  })
  async findAll(
    @CurrentUser() user: any,
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('flat') flat?: string,
  ) {
    return this.categoriesService.findAllForUser(user.id, type, flat === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async create(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a category' })
  async archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.archive(user.id, id);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder categories by providing an array of IDs' })
  async reorder(@CurrentUser() user: any, @Body() body: { orderedIds: string[] }) {
    return this.categoriesService.reorder(user.id, body.orderedIds);
  }
}
