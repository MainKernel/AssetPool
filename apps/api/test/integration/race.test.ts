import { AssignmentStatus, DeviceStatus, Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/shared/db/prisma.client.js';
import { app, createAssignment, createDevice, loginAs, resetDb } from '../factories.js';

describe('Race condition protection (FOR UPDATE)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('issues device only once under concurrent requests for two different assignments', async () => {
    const device = await createDevice({ status: DeviceStatus.AVAILABLE });
    const [a1, a2] = await Promise.all([
      createAssignment({ device_id: device.id }),
      createAssignment({ device_id: device.id }),
    ]);
    const admin = await loginAs(Role.ADMIN);

    const results = await Promise.all([
      request(app).post(`/api/assignments/${a1.id}/issue`).auth(admin, { type: 'bearer' }),
      request(app).post(`/api/assignments/${a2.id}/issue`).auth(admin, { type: 'bearer' }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.assignment.count({
        where: { device_id: device.id, status: AssignmentStatus.ACTIVE },
      }),
    ).toBe(1);
  });

  it('allows exactly 1 success when 20 parallel requests hit the same assignment', async () => {
    const device = await createDevice({ status: DeviceStatus.AVAILABLE });
    const assignment = await createAssignment({ device_id: device.id });
    const admin = await loginAs(Role.ADMIN);

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app)
          .post(`/api/assignments/${assignment.id}/issue`)
          .auth(admin, { type: 'bearer' }),
      ),
    );

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(
      await prisma.assignment.count({
        where: { device_id: device.id, status: AssignmentStatus.ACTIVE },
      }),
    ).toBe(1);
  });

  it('stays deterministic across 50 consecutive race iterations', async () => {
    const admin = await loginAs(Role.ADMIN);

    for (let i = 0; i < 50; i++) {
      const device = await createDevice({ status: DeviceStatus.AVAILABLE });
      const [a1, a2] = await Promise.all([
        createAssignment({ device_id: device.id }),
        createAssignment({ device_id: device.id }),
      ]);

      const results = await Promise.all([
        request(app).post(`/api/assignments/${a1.id}/issue`).auth(admin, { type: 'bearer' }),
        request(app).post(`/api/assignments/${a2.id}/issue`).auth(admin, { type: 'bearer' }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    }

    expect(
      await prisma.assignment.count({
        where: { status: AssignmentStatus.ACTIVE },
      }),
    ).toBe(50);
  });
});
