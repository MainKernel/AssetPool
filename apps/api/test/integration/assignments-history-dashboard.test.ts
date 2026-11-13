import { AssignmentStatus, DeviceStatus, Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/shared/db/prisma.client.js';
import { app, createAndLoginAs, createDevice, createUser, loginAs, resetDb } from '../factories.js';

describe('Assignments, History & Dashboard integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('runs full lifecycle: PENDING -> issue (ACTIVE + ISSUED) -> return (RETURNED + AVAILABLE) -> write-off', async () => {
    const admin = await loginAs(Role.ADMIN);
    const emp1 = await createAndLoginAs(Role.EMPLOYEE);
    const emp2 = await createAndLoginAs(Role.EMPLOYEE);
    const device = await createDevice({ status: DeviceStatus.AVAILABLE });

    // 1. Обидва співробітники подають заявки на той самий пристрій
    const req1 = await request(app)
      .post('/api/assignments')
      .auth(emp1.token, { type: 'bearer' })
      .send({ device_id: device.id });
    expect(req1.status).toBe(201);
    const a1Id = (req1.body as { id: number }).id;

    // Дубль PENDING тим самим користувачем -> 409
    const req1Dup = await request(app)
      .post('/api/assignments')
      .auth(emp1.token, { type: 'bearer' })
      .send({ device_id: device.id });
    expect(req1Dup.status).toBe(409);

    const req2 = await request(app)
      .post('/api/assignments')
      .auth(emp2.token, { type: 'bearer' })
      .send({ device_id: device.id });
    expect(req2.status).toBe(201);
    const a2Id = (req2.body as { id: number }).id;

    // 2. Адмін видає заявку 1 -> заявка 1 ACTIVE, заявка 2 автоматично REJECTED, пристрій ISSUED
    const issueRes = await request(app)
      .post(`/api/assignments/${a1Id}/issue`)
      .auth(admin, { type: 'bearer' });
    expect(issueRes.status).toBe(201);
    expect((issueRes.body as { status: string }).status).toBe(AssignmentStatus.ACTIVE);

    const a2After = await prisma.assignment.findUnique({ where: { id: a2Id } });
    expect(a2After?.status).toBe(AssignmentStatus.REJECTED);

    const devAfterIssue = await prisma.device.findUnique({ where: { id: device.id } });
    expect(devAfterIssue?.status).toBe(DeviceStatus.ISSUED);

    // Списання ISSUED пристрою -> 409
    const writeOffIssued = await request(app)
      .post(`/api/devices/${device.id}/write-off`)
      .auth(admin, { type: 'bearer' });
    expect(writeOffIssued.status).toBe(409);

    // Мої пристрої для emp1
    const myDevs = await request(app)
      .get('/api/users/me/devices')
      .auth(emp1.token, { type: 'bearer' });
    expect(myDevs.status).toBe(200);
    expect(myDevs.body).toHaveLength(1);

    // 3. Повернення пристрою -> RETURNED + AVAILABLE
    const returnRes = await request(app)
      .post(`/api/assignments/${a1Id}/return`)
      .auth(admin, { type: 'bearer' });
    expect(returnRes.status).toBe(200);
    expect((returnRes.body as { status: string }).status).toBe(AssignmentStatus.RETURNED);

    const devAfterReturn = await prisma.device.findUnique({ where: { id: device.id } });
    expect(devAfterReturn?.status).toBe(DeviceStatus.AVAILABLE);

    // 4. Тепер списання дозволене
    const writeOffOk = await request(app)
      .post(`/api/devices/${device.id}/write-off`)
      .auth(admin, { type: 'bearer' });
    expect(writeOffOk.status).toBe(200);
    expect((writeOffOk.body as { status: string }).status).toBe(DeviceStatus.WRITTEN_OFF);
  });

  it('supports direct issue, reject, history, CSV export, and role-based dashboard stats', async () => {
    const admin = await loginAs(Role.ADMIN);
    const emp = await createUser({ role: Role.EMPLOYEE });
    const empToken = await loginAs(Role.EMPLOYEE);
    const dev1 = await createDevice({ status: DeviceStatus.AVAILABLE });
    const dev2 = await createDevice({ status: DeviceStatus.AVAILABLE });

    const direct = await request(app)
      .post('/api/assignments/issue')
      .auth(admin, { type: 'bearer' })
      .send({ device_id: dev1.id, user_id: emp.id });
    expect(direct.status).toBe(201);
    expect((direct.body as { status: string }).status).toBe(AssignmentStatus.ACTIVE);

    const pending = await request(app)
      .post('/api/assignments')
      .auth(empToken, { type: 'bearer' })
      .send({ device_id: dev2.id });
    expect(pending.status).toBe(201);

    const rejected = await request(app)
      .post(`/api/assignments/${(pending.body as { id: number }).id}/reject`)
      .auth(admin, { type: 'bearer' });
    expect(rejected.status).toBe(200);
    expect((rejected.body as { status: string }).status).toBe(AssignmentStatus.REJECTED);

    const hist = await request(app).get('/api/history').auth(admin, { type: 'bearer' });
    expect(hist.status).toBe(200);
    expect((hist.body as { data: unknown[] }).data).toHaveLength(1);

    const adminAssignList = await request(app)
      .get('/api/assignments?status=REJECTED')
      .auth(admin, { type: 'bearer' });
    expect(adminAssignList.status).toBe(200);
    expect((adminAssignList.body as { data: unknown[] }).data).toHaveLength(1);

    const usersList = await request(app).get('/api/users').auth(admin, { type: 'bearer' });
    expect(usersList.status).toBe(200);
    expect((usersList.body as Record<string, unknown>[])[0]).not.toHaveProperty('password_hash');

    const myAssignments = await request(app)
      .get('/api/users/me/assignments')
      .auth(empToken, { type: 'bearer' });
    expect(myAssignments.status).toBe(200);
    expect((myAssignments.body as { data: unknown[] }).data).toHaveLength(1);

    const csv = await request(app).get('/api/history/export.csv').auth(admin, { type: 'bearer' });
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');

    const adminStats = await request(app)
      .get('/api/dashboard/stats')
      .auth(admin, { type: 'bearer' });
    expect(adminStats.status).toBe(200);
    expect(adminStats.body).toMatchObject({
      role: 'ADMIN',
      devices_available: 1,
      devices_issued: 1,
      devices_written_off: 0,
      pending_requests: 0,
    });

    const empStats = await request(app)
      .get('/api/dashboard/stats')
      .auth(empToken, { type: 'bearer' });
    expect(empStats.status).toBe(200);
    expect(empStats.body).toMatchObject({
      role: 'EMPLOYEE',
      my_devices_count: 0,
      my_pending_count: 0,
    });
  });
});
