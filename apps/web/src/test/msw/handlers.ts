import type { Category, Device, paths, Problem, User } from '@assetpool/schema';
import { http, HttpResponse } from 'msw';

type Login200 = paths['/auth/login']['post']['responses'][200]['content']['application/json'];
type Categories200 = paths['/categories']['get']['responses'][200]['content']['application/json'];
type Devices200 = paths['/devices']['get']['responses'][200]['content']['application/json'];
type MyAssignments200 =
  paths['/users/me/assignments']['get']['responses'][200]['content']['application/json'];

export function apiUrl<P extends keyof paths>(path: P): string {
  const normalized = String(path).replace(/\{([^}]+)\}/g, ':$1');
  return `http://localhost:5173/api${normalized}`;
}

export const mockCategories: Category[] = [
  { id: 1, name: 'Ноутбуки', description: 'Портативні компʼютери', devices_count: 2 },
  { id: 2, name: 'Монітори', description: 'Дисплеї для робочих місць', devices_count: 1 },
];

export const mockDevices: Device[] = [
  {
    id: 101,
    name: 'Lenovo ThinkPad T14',
    inventory_number: 'INV-2026-0101',
    status: 'AVAILABLE',
    category_id: 1,
    category: mockCategories[0]!,
    created_at: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 102,
    name: 'MacBook Pro 14',
    inventory_number: 'INV-2026-0102',
    status: 'ISSUED',
    category_id: 1,
    category: mockCategories[0]!,
    created_at: '2026-01-11T10:00:00.000Z',
  },
  {
    id: 201,
    name: 'Dell UltraSharp U2723QE',
    inventory_number: 'INV-2026-0201',
    status: 'AVAILABLE',
    category_id: 2,
    category: mockCategories[1]!,
    created_at: '2026-01-12T10:00:00.000Z',
  },
];

export const mockEmployeeUser: User = {
  id: 5,
  email: 'employee@assetpool.local',
  full_name: 'Олександр Коваленко',
  role: 'EMPLOYEE',
  created_at: '2026-01-01T08:00:00.000Z',
};

export const handlers = [
  http.post(apiUrl('/auth/refresh'), () => {
    const problem: Problem = {
      type: 'https://assetpool.local/problems/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Відсутній refresh-токен',
    };
    return HttpResponse.json(problem, {
      status: 401,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }),

  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'employee@assetpool.local' && body.password === 'Employee123!') {
      const res: Login200 = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 900,
        user: mockEmployeeUser,
      };
      return HttpResponse.json(res, { status: 200 });
    }

    const problem: Problem = {
      type: 'https://assetpool.local/problems/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Невірний логін або пароль',
    };
    return HttpResponse.json(problem, {
      status: 401,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }),

  http.get(apiUrl('/auth/me'), () => HttpResponse.json(mockEmployeeUser, { status: 200 })),

  http.get(apiUrl('/categories'), () => {
    const res: Categories200 = mockCategories;
    return HttpResponse.json(res, { status: 200 });
  }),

  http.get(apiUrl('/devices'), ({ request }) => {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search')?.toLowerCase();
    const status = url.searchParams.get('status');

    let filtered = mockDevices;
    if (categoryId) {
      filtered = filtered.filter((d) => d.category_id === Number(categoryId));
    }
    if (status) {
      filtered = filtered.filter((d) => d.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(search) ||
          d.inventory_number.toLowerCase().includes(search),
      );
    }

    const res: Devices200 = { data: filtered, nextCursor: null };
    return HttpResponse.json(res, { status: 200 });
  }),

  http.get(apiUrl('/users/me/assignments'), () => {
    const res: MyAssignments200 = { data: [], nextCursor: null };
    return HttpResponse.json(res, { status: 200 });
  }),
];
