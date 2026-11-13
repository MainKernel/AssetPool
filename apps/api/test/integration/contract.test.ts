import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DeviceStatus, Role } from '@prisma/client';
import { load as loadYaml } from 'js-yaml';
import OpenAPIResponseValidatorModule from 'openapi-response-validator';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/shared/db/prisma.client.js';
import { app, createDevice, createUser, loginAs, resetDb } from '../factories.js';

interface ResponseValidatorInstance {
  validateResponse(statusCode: number, response: unknown): unknown;
}

type ResponseValidatorCtor = new (args: {
  responses: Record<string, unknown>;
  components?: Record<string, unknown>;
}) => ResponseValidatorInstance;

const OpenAPIResponseValidator =
  (OpenAPIResponseValidatorModule as unknown as { default?: ResponseValidatorCtor }).default ??
  (OpenAPIResponseValidatorModule as unknown as ResponseValidatorCtor);

interface OpenApiDoc {
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
  components?: {
    schemas?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
}

/**
 * Конвертує OpenAPI 3.1 `type: [T, 'null']` у формат `type: T, nullable: true`
 * для сумісності з openapi-response-validator.
 */
function normalizeNullableTypes(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeNullableTypes);
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = normalizeNullableTypes(v);
    }
    if (Array.isArray(out.type) && out.type.includes('null')) {
      const nonNull = out.type.filter((t) => t !== 'null');
      if (nonNull.length === 1) {
        out.type = nonNull[0];
        out.nullable = true;
      }
    }
    return out;
  }
  return value;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openApiPath = path.resolve(__dirname, '../../../../packages/schema/openapi.yaml');
const rawDoc = loadYaml(fs.readFileSync(openApiPath, 'utf8')) as OpenApiDoc;
const openApiDoc = normalizeNullableTypes(rawDoc) as OpenApiDoc;

function resolveResponses(responses: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [statusCode, spec] of Object.entries(responses)) {
    if (spec && typeof spec === 'object' && '$ref' in spec) {
      const ref = (spec as { $ref: string }).$ref;
      const prefix = '#/components/responses/';
      if (ref.startsWith(prefix)) {
        const name = ref.slice(prefix.length);
        resolved[statusCode] = openApiDoc.components?.responses?.[name] ?? spec;
        continue;
      }
    }
    resolved[statusCode] = spec;
  }
  return resolved;
}

function createValidator(
  routePath: string,
  method: 'get' | 'post' | 'patch' | 'delete',
): ResponseValidatorInstance {
  const operation = openApiDoc.paths[routePath]?.[method];
  if (!operation) {
    throw new Error(`Operation ${method.toUpperCase()} ${routePath} not found in openapi.yaml`);
  }
  return new OpenAPIResponseValidator({
    responses: resolveResponses(operation.responses),
    components: openApiDoc.components,
  });
}

describe('OpenAPI Contract validation', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('validates Auth, Categories, Devices, Assignments, Dashboard and Problem responses against openapi.yaml', async () => {
    const user = await createUser({
      email: 'contract@assetpool.test',
      password: 'Password123!',
      role: Role.EMPLOYEE,
    });
    const admin = await loginAs(Role.ADMIN);
    const device = await createDevice({ status: DeviceStatus.AVAILABLE });

    // 1. POST /auth/login (200 & 401)
    const loginValidator = createValidator('/auth/login', 'post');
    const loginOk = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'Password123!',
    });
    expect(loginOk.status).toBe(200);
    expect(loginValidator.validateResponse(200, loginOk.body)).toBeUndefined();

    const loginErr = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPassword123!',
    });
    expect(loginErr.status).toBe(401);
    expect(loginErr.headers['content-type']).toContain('application/problem+json');
    expect((loginErr.body as { type: string }).type).toBe(
      'https://assetpool.local/problems/unauthorized',
    );
    expect(loginValidator.validateResponse(401, loginErr.body)).toBeUndefined();

    const empToken = (loginOk.body as { access_token: string }).access_token;

    // 2. GET /categories (200)
    const categoriesValidator = createValidator('/categories', 'get');
    const cats = await request(app).get('/api/categories').auth(empToken, { type: 'bearer' });
    expect(cats.status).toBe(200);
    expect(categoriesValidator.validateResponse(200, cats.body)).toBeUndefined();

    // 3. GET /devices (200)
    const devicesValidator = createValidator('/devices', 'get');
    const devs = await request(app).get('/api/devices').auth(empToken, { type: 'bearer' });
    expect(devs.status).toBe(200);
    expect(devicesValidator.validateResponse(200, devs.body)).toBeUndefined();

    // 4. POST /assignments (201 & 409)
    const assignValidator = createValidator('/assignments', 'post');
    const createdAssign = await request(app)
      .post('/api/assignments')
      .auth(empToken, { type: 'bearer' })
      .send({ device_id: device.id });
    expect(createdAssign.status).toBe(201);
    expect(assignValidator.validateResponse(201, createdAssign.body)).toBeUndefined();

    const dupAssign = await request(app)
      .post('/api/assignments')
      .auth(empToken, { type: 'bearer' })
      .send({ device_id: device.id });
    expect(dupAssign.status).toBe(409);
    expect(dupAssign.headers['content-type']).toContain('application/problem+json');
    expect((dupAssign.body as { type: string }).type).toBe(
      'https://assetpool.local/problems/duplicate-resource',
    );
    expect(assignValidator.validateResponse(409, dupAssign.body)).toBeUndefined();

    // 5. GET /dashboard/stats (200)
    const statsValidator = createValidator('/dashboard/stats', 'get');
    const stats = await request(app).get('/api/dashboard/stats').auth(admin, { type: 'bearer' });
    expect(stats.status).toBe(200);
    expect(statsValidator.validateResponse(200, stats.body)).toBeUndefined();
  });
});
