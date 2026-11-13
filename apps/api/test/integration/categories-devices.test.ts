import { DeviceStatus, Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/shared/db/prisma.client.js';
import {
  app,
  createAssignment,
  createCategory,
  createDevice,
  loginAs,
  resetDb,
} from '../factories.js';

describe('Categories & Devices integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('handles categories CRUD and prevents duplicate or non-empty delete', async () => {
    const admin = await loginAs(Role.ADMIN);

    const created = await request(app)
      .post('/api/categories')
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Ноутбуки', description: 'Робочі станції' });
    expect(created.status).toBe(201);
    const catId = (created.body as { id: number }).id;

    const dup = await request(app)
      .post('/api/categories')
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Ноутбуки' });
    expect(dup.status).toBe(409);

    await createDevice({ category_id: catId });

    const delNonEmpty = await request(app)
      .delete(`/api/categories/${catId}`)
      .auth(admin, { type: 'bearer' });
    expect(delNonEmpty.status).toBe(409);

    const list = await request(app).get('/api/categories').auth(admin, { type: 'bearer' });
    expect(list.status).toBe(200);
    expect(list.body).toEqual([
      { id: catId, name: 'Ноутбуки', description: 'Робочі станції', devices_count: 1 },
    ]);

    const updated = await request(app)
      .patch(`/api/categories/${catId}`)
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Ультрабуки' });
    expect(updated.status).toBe(200);
    expect((updated.body as { name: string }).name).toBe('Ультрабуки');

    const emptyCat = await createCategory({ name: 'Порожня' });
    const delEmpty = await request(app)
      .delete(`/api/categories/${emptyCat.id}`)
      .auth(admin, { type: 'bearer' });
    expect(delEmpty.status).toBe(204);
  });

  it('filters devices, hides WRITTEN_OFF from EMPLOYEE, and paginates without duplicates or gaps', async () => {
    const cat1 = await createCategory({ name: 'Монітори' });
    const cat2 = await createCategory({ name: 'Принтери' });

    for (let i = 1; i <= 25; i++) {
      await createDevice({
        category_id: i <= 20 ? cat1.id : cat2.id,
        name: i === 5 ? 'ThinkPad Ultra' : `Device ${i}`,
        inventory_number: `INV-PAG-${String(i).padStart(3, '0')}`,
      });
    }
    const writtenOff = await createDevice({
      category_id: cat1.id,
      status: DeviceStatus.WRITTEN_OFF,
    });

    const emp = await loginAs(Role.EMPLOYEE);
    const admin = await loginAs(Role.ADMIN);

    // Пагінація без дублікатів і пропусків (тест-кейс №4)
    const seenIds: number[] = [];
    let cursor: number | null = null;

    do {
      const qs: string = cursor ? `?limit=7&cursor=${cursor}` : '?limit=7';
      const pageRes = await request(app).get(`/api/devices${qs}`).auth(emp, { type: 'bearer' });
      expect(pageRes.status).toBe(200);
      const body = pageRes.body as {
        data: { id: number; status: DeviceStatus }[];
        nextCursor: number | null;
      };
      expect(body.data.every((d) => d.status !== DeviceStatus.WRITTEN_OFF)).toBe(true);
      seenIds.push(...body.data.map((d) => d.id));
      cursor = body.nextCursor;
    } while (cursor !== null);

    expect(seenIds).toHaveLength(25);
    expect(new Set(seenIds).size).toBe(25);

    // Пошук і фільтр за категорією
    const searchRes = await request(app)
      .get('/api/devices?search=ThinkPad')
      .auth(emp, { type: 'bearer' });
    expect(searchRes.status).toBe(200);
    expect((searchRes.body as { data: unknown[] }).data).toHaveLength(1);

    const cat2Res = await request(app)
      .get(`/api/devices?categoryId=${cat2.id}`)
      .auth(emp, { type: 'bearer' });
    expect(cat2Res.status).toBe(200);
    expect((cat2Res.body as { data: unknown[] }).data).toHaveLength(5);

    // EMPLOYEE не бачить WRITTEN_OFF по id (404), ADMIN бачить (200)
    const empWrittenOff = await request(app)
      .get(`/api/devices/${writtenOff.id}`)
      .auth(emp, { type: 'bearer' });
    expect(empWrittenOff.status).toBe(404);

    const adminWrittenOff = await request(app)
      .get(`/api/devices/${writtenOff.id}`)
      .auth(admin, { type: 'bearer' });
    expect(adminWrittenOff.status).toBe(200);
  });

  it('forbids deleting device with assignment history and forbids PATCH into ISSUED', async () => {
    const admin = await loginAs(Role.ADMIN);
    const cat = await createCategory({ name: 'Периферія' });
    const created = await request(app)
      .post('/api/devices')
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Logitech MX', inventory_number: 'INV-CREATE-1', category_id: cat.id });
    expect(created.status).toBe(201);
    const createdId = (created.body as { id: number }).id;

    const updated = await request(app)
      .patch(`/api/devices/${createdId}`)
      .auth(admin, { type: 'bearer' })
      .send({ name: 'Logitech MX Master 3S' });
    expect(updated.status).toBe(200);
    expect((updated.body as { name: string }).name).toBe('Logitech MX Master 3S');

    const delClean = await request(app)
      .delete(`/api/devices/${createdId}`)
      .auth(admin, { type: 'bearer' });
    expect(delClean.status).toBe(204);

    const device = await createDevice({ status: DeviceStatus.AVAILABLE });
    await createAssignment({ device_id: device.id });

    const del = await request(app)
      .delete(`/api/devices/${device.id}`)
      .auth(admin, { type: 'bearer' });
    expect(del.status).toBe(409);

    const patchIssued = await request(app)
      .patch(`/api/devices/${device.id}`)
      .auth(admin, { type: 'bearer' })
      .send({ status: DeviceStatus.ISSUED });
    expect(patchIssued.status).toBe(409);

    const devHistory = await request(app)
      .get(`/api/devices/${device.id}/history`)
      .auth(admin, { type: 'bearer' });
    expect(devHistory.status).toBe(200);
    expect((devHistory.body as { data: unknown[] }).data).toHaveLength(1);
  });
});
