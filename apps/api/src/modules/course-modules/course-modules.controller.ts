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
import { CreatorGuard, CreatorProfileId, Public } from '../../common/auth';
import { IdParamDto } from '../../common/dto/pagination.dto';
import { CourseModulesService } from './course-modules.service';
import {
  CourseModuleDto,
  CreateCourseModuleDto,
  UpdateCourseModuleDto,
} from './dto/course-module.dto';
import { ReorderModulesDto } from './dto/reorder.dto';

@Controller()
export class CourseModulesController {
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @Public()
  @Get('courses/:courseId/modules')
  listByCourse(
    @Param('courseId') courseId: string,
  ): Promise<CourseModuleDto[]> {
    return this.courseModulesService.listByCourse(courseId);
  }

  @UseGuards(CreatorGuard)
  @Post('courses/:courseId/modules')
  create(
    @CreatorProfileId() creatorProfileId: string,
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseModuleDto,
  ): Promise<CourseModuleDto> {
    return this.courseModulesService.create(creatorProfileId, courseId, dto);
  }

  @UseGuards(CreatorGuard)
  @Post('courses/:courseId/modules/reorder')
  reorder(
    @CreatorProfileId() creatorProfileId: string,
    @Param('courseId') courseId: string,
    @Body() dto: ReorderModulesDto,
  ): Promise<CourseModuleDto[]> {
    return this.courseModulesService.reorder(creatorProfileId, courseId, dto);
  }

  @UseGuards(CreatorGuard)
  @Patch('modules/:id')
  update(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCourseModuleDto,
  ): Promise<CourseModuleDto> {
    return this.courseModulesService.update(creatorProfileId, params.id, dto);
  }

  @UseGuards(CreatorGuard)
  @Delete('modules/:id')
  remove(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
  ): Promise<{ message: string }> {
    return this.courseModulesService.remove(creatorProfileId, params.id);
  }
}
