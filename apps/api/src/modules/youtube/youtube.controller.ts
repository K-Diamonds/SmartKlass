import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/auth';
import {
  ValidateYoutubeUrlQueryDto,
  YoutubeOEmbedDto,
  YoutubeValidationDto,
  YoutubeVideoIdParamDto,
} from './dto/youtube.dto';
import { YoutubeService } from './youtube.service';

@Public()
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('validate')
  validate(
    @Query() query: ValidateYoutubeUrlQueryDto,
  ): Promise<YoutubeValidationDto> {
    return this.youtubeService.validateUrl(query.url);
  }

  @Get('oembed/:videoId')
  getOEmbed(
    @Param() params: YoutubeVideoIdParamDto,
  ): Promise<YoutubeOEmbedDto> {
    return this.youtubeService.getOEmbed(params.videoId);
  }
}
