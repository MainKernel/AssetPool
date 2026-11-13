import { Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/shared/db/prisma.client.js';
import {
  app,
  createAndLoginAs,
  createAssignment,
  createUser,
  loginAs,
  resetDb,
} from '../factories.js';

describe('Auth & RBAC integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers employee with normalized email and argon2id password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: '  New.Employee@AssetPool.Local ',
      password: 'Password123!',
      full_name: 'Марія Коваленко',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      token_type: 'Bearer',
      user: {
        email: 'new.employee@assetpool.local',
        full_name: 'Марія Коваленко',
        role: 'EMPLOYEE',
      },
    });
    expect(typeof (res.body as { access_token: string }).access_token).toBe('string');

    const dbUsers = await prisma.user.findMany();
    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0]?.password_hash).not.toBe('Password123!');
    expect(dbUsers[0]?.password_hash.startsWith('$argon2id$')).toBe(true);

    const dup = await request(app).post('/api/auth/register').send({
      email: 'new.employee@assetpool.local',
      password: 'Password123!',
      full_name: 'Дублікат',
    });
    expect(dup.status).toBe(409);
    expect(dup.headers['content-type']).toContain('application/problem+json');
  });

  it('logs in, rotates refresh token, detects reuse, and logs out', async () => {
    const user = await createUser({
      email: 'emp@assetpool.test',
      password: 'Password123!',
      role: Role.EMPLOYEE,
    });

    const badLogin = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPassword123!',
    });
    expect(badLogin.status).toBe(401);
    expect(badLogin.headers['content-type']).toContain('application/problem+json');

    const loginRes = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    const cookie1 = loginRes.headers['set-cookie']?.[0];
    expect(cookie1).toContain('refresh_token=');
    expect(cookie1).toContain('HttpOnly');
    expect(cookie1).toContain('SameSite=Strict');

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie1!);
    expect(refreshRes.status).toBe(200);
    const cookie2 = refreshRes.headers['set-cookie']?.[0];
    expect(cookie2).toBeDefined();
    expect(cookie2).not.toBe(cookie1);

    // Reuse detection: повторне використання старого cookie1 анулює всі сесії користувача
    const reuseRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie1!);
    expect(reuseRes.status).toBe(401);

    const afterReuseRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie2!);
    expect(afterReuseRes.status).toBe(401);

    // Повторний логін і logout
    const login2 = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'Password123!',
    });
    const accessToken = (login2.body as { access_token: string }).access_token;
    const cookie3 = login2.headers['set-cookie']?.[0];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .auth(accessToken, { type: 'bearer' })
      .set('Cookie', cookie3!);
    expect(logoutRes.status).toBe(204);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', cookie3!);
    expect(afterLogout.status).toBe(401);
  });

  it('enforces RBAC: 401 without token, 403 for EMPLOYEE on admin routes, 404 on foreign assignment', async () => {
    const noAuth = await request(app).get('/api/devices');
    expect(noAuth.status).toBe(401);

    const emp1 = await createAndLoginAs(Role.EMPLOYEE);
    const emp2Token = await loginAs(Role.EMPLOYEE);

    const empAdminList = await request(app)
      .get('/api/assignments')
      .auth(emp1.token, { type: 'bearer' });
    expect(empAdminList.status).toBe(403);

    const empCreateCat = await request(app)
      .post('/api/categories')
      .auth(emp1.token, { type: 'bearer' })
      .send({ name: 'Заборонена' });
    expect(empCreateCat.status).toBe(403);

    const assignment = await createAssignment({ user_id: emp1.user.id });

    // Чужа заявка -> 404 (НВ-2)
    const foreignView = await request(app)
      .get(`/api/assignments/${assignment.id}`)
      .auth(emp2Token, { type: 'bearer' });
    expect(foreignView.status).toBe(404);

    // Власна заявка -> 200
    const ownView = await request(app)
      .get(`/api/assignments/${assignment.id}`)
      .auth(emp1.token, { type: 'bearer' });
    expect(ownView.status).toBe(200);
  });

  it('returns 429 problem+json when auth rate limit is exceeded', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('x-test-rate-limit', '1')
        .send({ email: 'nobody@assetpool.test', password: 'Password123!' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('x-test-rate-limit', '1')
      .send({ email: 'nobody@assetpool.test', password: 'Password123!' });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['content-type']).toContain('application/problem+json');
  });
});
