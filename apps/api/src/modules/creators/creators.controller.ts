import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, Public } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { SlugParamDto } from '../../common/dto/pagination.dto';
import { CreatorsService } from './creators.service';
import {
  BecomeCreatorDto,
  CreatorDirectoryItemDto,
  CreatorProfileDto,
  CreatorPublicProfileDto,
  UpdateCreatorProfileDto,
} from './dto/creator.dto';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post('become-creator')
  becomeCreator(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BecomeCreatorDto,
  ): Promise<CreatorProfileDto> {
    return this.creatorsService.becomeCreator(user, dto);
  }

  @Get('profile')
  getMyProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorProfileDto> {
    return this.creatorsService.getMyProfile(user);
  }

  @Patch('profile')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileDto> {
    return this.creatorsService.updateMyProfile(user, dto);
  }

  @Public()
  @Get('directory')
  listDirectory(): Promise<CreatorDirectoryItemDto[]> {
    return this.creatorsService.listDirectory();
  }

  @Public()
  @Get(':slug')
  getPublicProfile(
    @Param() params: SlugParamDto,
  ): Promise<CreatorPublicProfileDto> {
    return this.creatorsService.getPublicProfile(params.slug);
  }
}
