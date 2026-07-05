import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import {
  CreateFavoriteDto,
  FavoriteDto,
  ListFavoritesQueryDto,
} from './dto/favorite.dto';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('me')
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFavoritesQueryDto,
  ): Promise<PaginatedResultDto<FavoriteDto>> {
    return this.favoritesService.listMine(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFavoriteDto,
  ): Promise<FavoriteDto> {
    return this.favoritesService.create(user, dto);
  }

  @Delete('by-slug/:courseSlug')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug') courseSlug: string,
  ): Promise<{ message: string }> {
    return this.favoritesService.remove(user, courseSlug);
  }
}
