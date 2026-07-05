import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderModulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  moduleIds!: string[];
}
