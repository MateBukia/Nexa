import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async findOne(idOrSlug: string, includeInactive = false) {
    const category = await this.prisma.category.findFirst({
      where: {
        ...(isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertSlugAvailable(dto.slug);
    if (dto.parentId) await this.assertExists(dto.parentId);

    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.assertExists(id);
    if (dto.slug) await this.assertSlugAvailable(dto.slug, id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent.');
      }
      await this.assertExists(dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }

    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!category) throw new NotFoundException('Category not found.');
    if (category._count.products || category._count.children) {
      throw new ConflictException(
        'Move this category’s products and child categories before deleting it.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found.');
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (category && category.id !== exceptId) {
      throw new ConflictException('Category slug is already in use.');
    }
  }

  private async assertNoCycle(categoryId: string, parentId: string) {
    let currentId: string | null = parentId;
    while (currentId) {
      if (currentId === categoryId) {
        throw new ConflictException(
          'Category hierarchy cannot contain a cycle.',
        );
      }
      const parent: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = parent?.parentId ?? null;
    }
  }
}
