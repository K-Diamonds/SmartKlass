import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderLessonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  lessonIds!: string[];
}
