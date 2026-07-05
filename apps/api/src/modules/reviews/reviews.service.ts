import { Injectable } from '@nestjs/common';
import { PaginatedResultDto } from '../../common/dto/pagination.dto';
import { PlaceholderService } from '../../common/services/placeholder.service';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ReviewDto,
  UpdateReviewDto,
} from './dto/review.dto';

@Injectable()
export class ReviewsService extends PlaceholderService {
  listByCourse(
    _courseId: string,
    _query: ListReviewsQueryDto,
  ): Promise<PaginatedResultDto<ReviewDto>> {
    this.notImplemented('Review listing');
  }

  create(_courseId: string, _dto: CreateReviewDto): Promise<ReviewDto> {
    this.notImplemented('Review creation');
  }

  update(_id: string, _dto: UpdateReviewDto): Promise<ReviewDto> {
    this.notImplemented('Review update');
  }
}
