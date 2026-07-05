export class CategoryDto {
  id!: string;
  slug!: string;
  name!: string;
  description!: string | null;
  parentId!: string | null;
  sortOrder!: number;
  courseCount!: number;
}

export class CategoryDetailDto extends CategoryDto {
  children!: CategoryDto[];
}
