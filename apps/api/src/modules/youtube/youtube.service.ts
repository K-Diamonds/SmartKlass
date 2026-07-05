import { BadRequestException, Injectable } from '@nestjs/common';
import { parseYoutubeUrl } from '../../common/youtube/parse-youtube-url';
import { YoutubeOEmbedDto, YoutubeValidationDto } from './dto/youtube.dto';

@Injectable()
export class YoutubeService {
  validateUrl(url: string): Promise<YoutubeValidationDto> {
    const parsed = parseYoutubeUrl(url);

    if (!parsed) {
      throw new BadRequestException('Invalid YouTube URL.');
    }

    return Promise.resolve({
      isValid: true,
      videoId: parsed.videoId,
      normalizedUrl: parsed.normalizedUrl,
      thumbnailUrl: parsed.thumbnailUrl,
    });
  }

  getOEmbed(videoId: string): Promise<YoutubeOEmbedDto> {
    const parsed = parseYoutubeUrl(
      `https://www.youtube.com/watch?v=${videoId}`,
    );

    if (!parsed) {
      throw new BadRequestException('Invalid YouTube video ID.');
    }

    return Promise.resolve({
      videoId: parsed.videoId,
      title: null,
      authorName: null,
      thumbnailUrl: parsed.thumbnailUrl,
      html: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${parsed.videoId}" frameborder="0" allowfullscreen></iframe>`,
    });
  }
}
