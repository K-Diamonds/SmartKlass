import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, Prisma } from '@smartklass/database';
import { PrismaService } from '../../common/database/prisma.service';
import { CategoryDetailDto, CategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null, parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            courses: {
              where: {
                course: {
                  deletedAt: null,
                  status: CourseStatus.PUBLISHED,
                },
              },
            },
          },
        },
      },
    });

    return categories.map((category) => this.toCategoryDto(category));
  }

  async getBySlug(slug: string): Promise<CategoryDetailDto> {
    const category = await this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: {
                courses: {
                  where: {
                    course: {
                      deletedAt: null,
                      status: CourseStatus.PUBLISHED,
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            courses: {
              where: {
                course: {
                  deletedAt: null,
                  status: CourseStatus.PUBLISHED,
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return {
      ...this.toCategoryDto(category),
      children: category.children.map((child) => this.toCategoryDto(child)),
    };
  }

  private toCategoryDto(category: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    parentId: string | null;
    sortOrder: number;
    _count?: { courses: number };
  }): CategoryDto {
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      courseCount: category._count?.courses ?? 0,
    };
  }
}
