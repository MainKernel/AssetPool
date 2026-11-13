import { prisma } from '../../shared/db/prisma.client.js';

export const categoriesRepository = {
  findAllWithCount() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });
  },

  findById(id: number) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });
  },

  findByName(name: string) {
    return prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });
  },

  create(data: { name: string; description?: string | null }) {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });
  },

  update(id: number, data: { name?: string; description?: string | null }) {
    return prisma.category.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });
  },

  countDevices(categoryId: number) {
    return prisma.device.count({
      where: { category_id: categoryId },
    });
  },

  delete(id: number) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
