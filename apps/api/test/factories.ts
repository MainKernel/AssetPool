import { AssignmentStatus, DeviceStatus, Role } from '@prisma/client';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { prisma } from '../src/shared/db/prisma.client.js';

let seq = 1;
const nextSeq = () => seq++;

export const app = createApp();

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE refresh_tokens, assignments, devices, categories, users RESTART IDENTITY CASCADE',
  );
}

export async function createUser(
  overrides: Partial<{
    email: string;
    password: string;
    full_name: string;
    role: Role;
  }> = {},
) {
  const n = nextSeq();
  const password = overrides.password ?? 'Password123!';
  const password_hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `user${n}@assetpool.test`,
      password_hash,
      full_name: overrides.full_name ?? `Тестовий Користувач ${n}`,
      role: overrides.role ?? Role.EMPLOYEE,
    },
  });

  return { ...user, plainPassword: password };
}

export async function createCategory(
  overrides: Partial<{
    name: string;
    description: string | null;
  }> = {},
) {
  const n = nextSeq();
  return prisma.category.create({
    data: {
      name: overrides.name ?? `Категорія ${n}`,
      description: overrides.description ?? `Опис категорії ${n}`,
    },
  });
}

export async function createDevice(
  overrides: Partial<{
    category_id: number;
    name: string;
    inventory_number: string;
    status: DeviceStatus;
  }> = {},
) {
  const n = nextSeq();
  const categoryId = overrides.category_id ?? (await createCategory()).id;

  return prisma.device.create({
    data: {
      category_id: categoryId,
      name: overrides.name ?? `Пристрій ${n}`,
      inventory_number: overrides.inventory_number ?? `INV-TEST-${String(n).padStart(5, '0')}`,
      status: overrides.status ?? DeviceStatus.AVAILABLE,
    },
  });
}

export async function createAssignment(
  overrides: Partial<{
    user_id: number;
    device_id: number;
    status: AssignmentStatus;
    assigned_at: Date | null;
    returned_at: Date | null;
  }> = {},
) {
  const userId = overrides.user_id ?? (await createUser()).id;
  const deviceId = overrides.device_id ?? (await createDevice()).id;

  return prisma.assignment.create({
    data: {
      user_id: userId,
      device_id: deviceId,
      status: overrides.status ?? AssignmentStatus.PENDING,
      assigned_at: overrides.assigned_at ?? null,
      returned_at: overrides.returned_at ?? null,
    },
  });
}

export async function createAndLoginAs(role: Role) {
  const user = await createUser({ role });
  const res = await request(app).post('/api/auth/login').send({
    email: user.email,
    password: user.plainPassword,
  });

  if (res.status !== 200) {
    throw new Error(`loginAs(${role}) failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }

  const body = res.body as { access_token: string };
  return { token: body.access_token, user };
}

export async function loginAs(role: Role): Promise<string> {
  const { token } = await createAndLoginAs(role);
  return token;
}
