import { Injectable } from '@nestjs/common';
import { PlaceholderService } from '../../common/services/placeholder.service';
import { CategoryDetailDto, CategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService extends PlaceholderService {
  list(): Promise<CategoryDto[]> {
    this.notImplemented('Category listing');
  }

  getBySlug(_slug: string): Promise<CategoryDetailDto> {
    this.notImplemented('Category detail');
  }
}
