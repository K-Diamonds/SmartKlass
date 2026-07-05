import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth/interfaces/authenticated-user.interface';
import { UpdateUserDto, UserLibraryDto, UserProfileDto } from './dto/user.dto';
import { UsersService } from './users.service';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileDto> {
    return this.usersService.getMe(user);
  }

  @Get('me/library')
  getMyLibrary(@CurrentUser() user: AuthenticatedUser): Promise<UserLibraryDto> {
    return this.usersService.getMyLibrary(user);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateMe(user, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedAvatarFile,
  ): Promise<UserProfileDto> {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }

    return this.usersService.uploadAvatar(user, file);
  }
}
