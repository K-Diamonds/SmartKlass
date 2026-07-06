import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AccessService,
  CourseAccessStatusDto,
  CourseWatchDto,
  RequireCourseAccess,
  RequireCourseAccessGuard,
} from '../../common/access';
import {
  CreatorGuard,
  CreatorProfileId,
  CurrentUser,
  Public,
} from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import {
  IdParamDto,
  PaginatedResultDto,
  SlugParamDto,
} from '../../common/dto/pagination.dto';
import { CoursesService } from './courses.service';
import {
  CourseDetailDto,
  CourseSummaryDto,
  CreateCourseDto,
  CreatorCourseListItemDto,
  CreatorCourseStudioDto,
  CourseThumbnailDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';

type UploadedThumbnailFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly accessService: AccessService,
  ) {}

  @Public()
  @Get()
  list(
    @Query() query: ListCoursesQueryDto,
  ): Promise<PaginatedResultDto<CourseSummaryDto>> {
    return this.coursesService.list(query);
  }

  @UseGuards(CreatorGuard)
  @Get('mine')
  listMine(
    @CreatorProfileId() creatorProfileId: string,
    @Query() query: ListCoursesQueryDto,
  ): Promise<PaginatedResultDto<CreatorCourseListItemDto>> {
    return this.coursesService.listMine(creatorProfileId, query);
  }

  @UseGuards(CreatorGuard)
  @Get('mine/:id')
  getMineById(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<CreatorCourseStudioDto> {
    return this.coursesService.getMineById(creatorProfileId, params.id);
  }

  @UseGuards(CreatorGuard)
  @Post('thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(
    @UploadedFile() file?: UploadedThumbnailFile,
  ): Promise<CourseThumbnailDto> {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }

    return this.coursesService.uploadThumbnail(file);
  }

  @Get(':id/access')
  getAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<CourseAccessStatusDto> {
    return this.accessService.getCourseAccessStatus(user.id, params.id);
  }

  @UseGuards(RequireCourseAccessGuard)
  @RequireCourseAccess('id')
  @Get(':id/watch')
  getWatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
  ): Promise<CourseWatchDto> {
    return this.accessService.getCourseWatch(user.id, params.id);
  }

  @Public()
  @Get('by-id/:id')
  getPublishedById(@Param() params: IdParamDto): Promise<CourseDetailDto> {
    return this.coursesService.getPublishedById(params.id);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param() params: SlugParamDto): Promise<CourseDetailDto> {
    return this.coursesService.getBySlug(params.slug);
  }

  @UseGuards(CreatorGuard)
  @Post()
  create(
    @CreatorProfileId() creatorProfileId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<CourseDetailDto> {
    return this.coursesService.create(creatorProfileId, dto);
  }

  @UseGuards(CreatorGuard)
  @Patch(':id')
  update(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseDetailDto> {
    return this.coursesService.update(creatorProfileId, params.id, dto);
  }

  @UseGuards(CreatorGuard)
  @Post(':id/publish')
  publish(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<CourseDetailDto> {
    return this.coursesService.publish(creatorProfileId, params.id);
  }

  @UseGuards(CreatorGuard)
  @Post(':id/archive')
  archive(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<CourseDetailDto> {
    return this.coursesService.archive(creatorProfileId, params.id);
  }
}
