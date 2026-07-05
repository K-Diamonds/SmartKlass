import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatorGuard, CreatorProfileId, Public } from '../../common/auth';
import { IdParamDto } from '../../common/dto/pagination.dto';
import { AccessPlansService } from './access-plans.service';
import {
  AccessPlanDto,
  CreateAccessPlanDto,
  UpdateAccessPlanDto,
} from './dto/access-plan.dto';

@Controller()
export class AccessPlansController {
  constructor(private readonly accessPlansService: AccessPlansService) {}

  @Public()
  @Get('courses/:courseId/access-plans')
  listByCourse(@Param('courseId') courseId: string): Promise<AccessPlanDto[]> {
    return this.accessPlansService.listByCourse(courseId);
  }

  @UseGuards(CreatorGuard)
  @Get('creator/courses/:courseId/access-plans')
  listMineByCourse(
    @CreatorProfileId() creatorProfileId: string,
    @Param('courseId') courseId: string,
  ): Promise<AccessPlanDto[]> {
    return this.accessPlansService.listMineByCourse(creatorProfileId, courseId);
  }

  @UseGuards(CreatorGuard)
  @Post('courses/:courseId/access-plans')
  create(
    @CreatorProfileId() creatorProfileId: string,
    @Param('courseId') courseId: string,
    @Body() dto: CreateAccessPlanDto,
  ): Promise<AccessPlanDto> {
    return this.accessPlansService.create(creatorProfileId, courseId, dto);
  }

  @UseGuards(CreatorGuard)
  @Patch('access-plans/:id')
  update(
    @CreatorProfileId() creatorProfileId: string,
    @Param() params: IdParamDto,
    @Body() dto: UpdateAccessPlanDto,
  ): Promise<AccessPlanDto> {
    return this.accessPlansService.update(creatorProfileId, params.id, dto);
  }
}
