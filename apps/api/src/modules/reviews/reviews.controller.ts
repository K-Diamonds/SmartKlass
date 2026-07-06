import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Public } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
} from '../../common/dto/pagination.dto';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ReviewDto,
  UpdateReviewDto,
} from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('courses/:courseId/reviews')
  listByCourse(
    @Param('courseId') courseId: string,
    @Query() query: ListReviewsQueryDto,
  ): Promise<PaginatedResultDto<ReviewDto>> {
    return this.reviewsService.listByCourse(courseId, query);
  }

  @Post('courses/:courseId/reviews')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviewsService.create(user, courseId, dto);
  }

  @Patch('reviews/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviewsService.update(user, params.id, dto);
  }
}
