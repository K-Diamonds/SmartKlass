import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AccessService,
  LessonWatchDto,
  RequireLessonAccess,
  RequireLessonAccessGuard,
} from '../../common/access';
import {
  CreatorGuard,
  CreatorProfileId,
  CurrentUser,
  OptionalAuthGuard,
  Public,
} from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { IdParamDto } from '../../common/dto/pagination.dto';
import {
  CreateLessonDto,
  CreateLessonResourceDto,
  LessonDetailDto,
  LessonDto,
  PublicLessonDetailDto,
  PublicLessonDto,
  SetLessonYoutubeDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { LessonsService } from './lessons.service';

@Controller()
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly accessService: AccessService,
  ) {}

  @Public()
  @Get('modules/:moduleId/lessons')
  listByModule(
    @Param('moduleId') moduleId: string,
  ): Promise<PublicLessonDto[]> {
    return this.lessonsService.listByModule(moduleId);
  }

  @UseGuards(CreatorGuard)
  @Post('modules/:moduleId/lessons')
  create(
    @CreatorProfileId() creatorProfileId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<LessonDetailDto> {
    return this.lessonsService.create(creatorProfileId, moduleId, dto);
  }

  @UseGuards(CreatorGuard)
  @Post('modules/:moduleId/lessons/reorder')
  reorder(
    @CreatorProfileId() creatorProfileId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: ReorderLessonsDto,
  ): Promise<LessonDto[]> {
    return this.lessonsService.reorder(creatorProfileId, moduleId, dto);
  }

  @Public()
  @Get('lessons/:id')
  getById(@Param() params: IdParamDto): Promise<PublicLessonDetailDto> {
    return this.lessonsService.getPublicById(params.id);
  }

  @Public()
  @UseGuards(OptionalAuthGuard, RequireLessonAccessGuard)
  @RequireLessonAccess('id')
  @Get('lessons/:id/watch')
  getWatch(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param() params: IdParamDto,
  ): Promise<LessonWatchDto> {
    return this.accessService.getLessonWatch(user?.id ?? null, params.id);
  }

  @UseGuards(CreatorGuard)
  @Patch('lessons/:id')
  update(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonDetailDto> {
    return this.lessonsService.update(creatorProfileId, params.id, dto);
  }

  @UseGuards(CreatorGuard)
  @Post('lessons/:id/youtube')
  setYoutube(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: SetLessonYoutubeDto,
  ): Promise<LessonDetailDto> {
    return this.lessonsService.setYoutube(creatorProfileId, params.id, dto);
  }

  @UseGuards(CreatorGuard)
  @Post('lessons/:id/resources')
  addResource(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: CreateLessonResourceDto,
  ): Promise<LessonDetailDto> {
    return this.lessonsService.addResource(creatorProfileId, params.id, dto);
  }

  @UseGuards(CreatorGuard)
  @Delete('lessons/:id')
  remove(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<{ message: string }> {
    return this.lessonsService.remove(creatorProfileId, params.id);
  }
}
