import { ConflictError, NotFoundError, PROBLEM_TYPES } from '../../shared/errors/problem.js';
import { categoriesRepository } from './categories.repository.js';
import type { CategoryInput, CategoryUpdateInput } from './categories.schema.js';

function mapCategory(row: {
  id: number;
  name: string;
  description: string | null;
  _count: { devices: number };
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    devices_count: row._count.devices,
  };
}

export const categoriesService = {
  async list() {
    const rows = await categoriesRepository.findAllWithCount();
    return rows.map(mapCategory);
  },

  async create(input: CategoryInput) {
    const existing = await categoriesRepository.findByName(input.name);
    if (existing) {
      throw new ConflictError(
        'Категорія з такою назвою вже існує',
        PROBLEM_TYPES.DUPLICATE_RESOURCE,
      );
    }

    const created = await categoriesRepository.create({
      name: input.name,
      description: input.description ?? null,
    });
    return mapCategory(created);
  },

  async update(id: number, input: CategoryUpdateInput) {
    const current = await categoriesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Категорію не знайдено');
    }

    if (input.name !== undefined) {
      const duplicate = await categoriesRepository.findByName(input.name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          'Категорія з такою назвою вже існує',
          PROBLEM_TYPES.DUPLICATE_RESOURCE,
        );
      }
    }

    const updated = await categoriesRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    });
    return mapCategory(updated);
  },

  async remove(id: number) {
    const current = await categoriesRepository.findById(id);
    if (!current) {
      throw new NotFoundError('Категорію не знайдено');
    }

    const devicesCount = await categoriesRepository.countDevices(id);
    if (devicesCount > 0) {
      throw new ConflictError(
        `Неможливо видалити категорію: до неї прив’язано ${devicesCount} пристроїв`,
        PROBLEM_TYPES.INVALID_STATE_TRANSITION,
      );
    }

    await categoriesRepository.delete(id);
  },
};
