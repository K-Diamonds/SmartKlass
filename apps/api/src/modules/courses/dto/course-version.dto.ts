import { IsDateString, IsString } from 'class-validator';

export class ScheduleVersionDto {
  @IsDateString()
  scheduledFor!: string;
}

export class DiffVersionsQueryDto {
  @IsString()
  fromVersionId!: string;

  @IsString()
  toVersionId!: string;
}
