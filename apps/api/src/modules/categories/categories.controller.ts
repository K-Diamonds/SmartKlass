import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/auth';
import { SlugParamDto } from '../../common/dto/pagination.dto';
import { CategoriesService } from './categories.service';
import { CategoryDetailDto, CategoryDto } from './dto/category.dto';

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(): Promise<CategoryDto[]> {
    return this.categoriesService.list();
  }

  @Get(':slug')
  getBySlug(@Param() params: SlugParamDto): Promise<CategoryDetailDto> {
    return this.categoriesService.getBySlug(params.slug);
  }
}
