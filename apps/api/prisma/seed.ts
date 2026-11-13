import { fakerUK as faker } from '@faker-js/faker';
import { AssignmentStatus, DeviceStatus, PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const CATEGORIES: { name: string; description: string }[] = [
  { name: 'Ноутбуки', description: 'Портативні робочі станції та ультрабуки' },
  { name: 'Монітори', description: 'Дисплеї для робочих місць' },
  { name: 'Периферія', description: 'Клавіатури, миші, вебкамери' },
  { name: 'Смартфони', description: 'Корпоративні мобільні телефони та тестові пристрої' },
  { name: 'Планшети', description: 'Планшетні комп’ютери для тестування та презентацій' },
  { name: 'Мережеве обладнання', description: 'Маршрутизатори, комутатори, точки доступу' },
  { name: 'Принтери', description: 'БФП та офісні принтери' },
  { name: 'Гарнітури', description: 'Дротові та бездротові гарнітури для дзвінків' },
  { name: 'Док-станції', description: 'USB-C / Thunderbolt док-станції та хаби' },
  { name: 'Сервери/NAS', description: 'Мережеві сховища та тестові сервери' },
];

const DEVICE_MODELS: Record<string, string[]> = {
  Ноутбуки: [
    'Lenovo ThinkPad T14 Gen 4',
    'Apple MacBook Pro 14 M3',
    'Dell XPS 15',
    'HP EliteBook 840',
  ],
  Монітори: ['Dell P2422H', 'Dell U2723QE', 'LG UltraFine 27', 'ASUS ProArt PA278CV'],
  Периферія: ['Logitech MX Master 3S', 'Keychron K2 Pro', 'Logitech C920 HD Pro'],
  Смартфони: ['Apple iPhone 15', 'Samsung Galaxy S24', 'Google Pixel 8'],
  Планшети: ['Apple iPad Air M2', 'Samsung Galaxy Tab S9'],
  'Мережеве обладнання': ['Ubiquiti UniFi U6 Pro', 'MikroTik RB5009UG+S+IN'],
  Принтери: ['HP LaserJet Pro M404dn', 'Brother HL-L2350DW'],
  Гарнітури: ['Jabra Evolve2 65', 'Sony WH-1000XM5'],
  'Док-станції': ['Dell WD19TBS', 'CalDigit TS4'],
  'Сервери/NAS': ['Synology DS923+', 'Dell PowerEdge T150'],
};

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== 'true') {
    throw new Error('Refusing to run seed in production without SEED_FORCE=true');
  }

  faker.seed(2026);

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE refresh_tokens, assignments, devices, categories, users RESTART IDENTITY CASCADE',
  );

  // 1. 10 категорій
  const categories = await Promise.all(CATEGORIES.map((c) => prisma.category.create({ data: c })));

  // 2. 50+ користувачів (3 ADMIN + 48 EMPLOYEE)
  const adminHash = await argon2.hash('Admin123!', { type: argon2.argon2id });
  const simpleAdminHash = await argon2.hash('admin', { type: argon2.argon2id });
  const employeeHash = await argon2.hash('Employee123!', { type: argon2.argon2id });

  const usersData: {
    email: string;
    password_hash: string;
    full_name: string;
    role: Role;
  }[] = [
    {
      email: 'admin@admin',
      password_hash: simpleAdminHash,
      full_name: 'Адміністратор',
      role: Role.ADMIN,
    },
    {
      email: 'admin@assetpool.local',
      password_hash: adminHash,
      full_name: 'Ірина Сидоренко',
      role: Role.ADMIN,
    },
    {
      email: 'admin2@assetpool.local',
      password_hash: adminHash,
      full_name: 'Олег Мельник',
      role: Role.ADMIN,
    },
    {
      email: 'employee@assetpool.local',
      password_hash: employeeHash,
      full_name: 'Олександр Коваленко',
      role: Role.EMPLOYEE,
    },
  ];

  for (let i = 4; i <= 50; i++) {
    usersData.push({
      email: `user${i}@assetpool.local`,
      password_hash: employeeHash,
      full_name: faker.person.fullName(),
      role: Role.EMPLOYEE,
    });
  }

  await prisma.user.createMany({ data: usersData });
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const employees = users.filter((u) => u.role === Role.EMPLOYEE);

  // 3. 200 пристроїв (120 AVAILABLE, 70 ISSUED, 10 WRITTEN_OFF)
  const devicesData: {
    category_id: number;
    name: string;
    inventory_number: string;
    status: DeviceStatus;
  }[] = [];

  for (let i = 1; i <= 200; i++) {
    const category = categories[(i - 1) % categories.length]!;
    const models = DEVICE_MODELS[category.name] ?? ['Corporate IT Device'];
    const model = models[i % models.length]!;
    let status: DeviceStatus = DeviceStatus.AVAILABLE;
    if (i > 120 && i <= 190) {
      status = DeviceStatus.ISSUED;
    } else if (i > 190) {
      status = DeviceStatus.WRITTEN_OFF;
    }

    devicesData.push({
      category_id: category.id,
      name: model,
      inventory_number: `INV-2026-${String(i).padStart(4, '0')}`,
      status,
    });
  }

  await prisma.device.createMany({ data: devicesData });
  const devices = await prisma.device.findMany({ orderBy: { id: 'asc' } });

  const availableDevices = devices.filter((d) => d.status === DeviceStatus.AVAILABLE);
  const issuedDevices = devices.filter((d) => d.status === DeviceStatus.ISSUED);

  // 4. 500 записів про видачу
  const now = new Date('2026-11-10T12:00:00Z');
  const assignmentsData: {
    user_id: number;
    device_id: number;
    status: AssignmentStatus;
    created_at: Date;
    assigned_at: Date | null;
    returned_at: Date | null;
  }[] = [];

  // 4.1. Рівно 70 ACTIVE (по одному на кожен ISSUED пристрій)
  for (let i = 0; i < issuedDevices.length; i++) {
    const device = issuedDevices[i]!;
    const user = employees[i % employees.length]!;
    const createdAt = faker.date.between({ from: new Date('2026-06-01T00:00:00Z'), to: now });
    const assignedAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 2);
    assignmentsData.push({
      user_id: user.id,
      device_id: device.id,
      status: AssignmentStatus.ACTIVE,
      created_at: createdAt,
      assigned_at: assignedAt,
      returned_at: null,
    });
  }

  // 4.2. 10 PENDING заявок на AVAILABLE пристрої (унікальні пари user_id + device_id)
  for (let i = 0; i < 10; i++) {
    const device = availableDevices[i]!;
    const user = employees[i % employees.length]!;
    const createdAt = faker.date.between({ from: new Date('2026-11-01T00:00:00Z'), to: now });
    assignmentsData.push({
      user_id: user.id,
      device_id: device.id,
      status: AssignmentStatus.PENDING,
      created_at: createdAt,
      assigned_at: null,
      returned_at: null,
    });
  }

  // 4.3. 420 історичних записів (360 RETURNED + 60 REJECTED)
  for (let i = 0; i < 420; i++) {
    const device = devices[i % devices.length]!;
    const user = employees[(i * 7) % employees.length]!;
    const createdAt = faker.date.between({
      from: new Date('2025-01-01T00:00:00Z'),
      to: new Date('2026-05-31T00:00:00Z'),
    });

    if (i < 360) {
      const assignedAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 4);
      const returnedAt = new Date(assignedAt.getTime() + 1000 * 60 * 60 * 24 * ((i % 60) + 1));
      assignmentsData.push({
        user_id: user.id,
        device_id: device.id,
        status: AssignmentStatus.RETURNED,
        created_at: createdAt,
        assigned_at: assignedAt,
        returned_at: returnedAt,
      });
    } else {
      assignmentsData.push({
        user_id: user.id,
        device_id: device.id,
        status: AssignmentStatus.REJECTED,
        created_at: createdAt,
        assigned_at: null,
        returned_at: null,
      });
    }
  }

  await prisma.assignment.createMany({ data: assignmentsData });

  console.log(
    `Seed completed: ${categories.length} categories, ${users.length} users, ${devices.length} devices, ${assignmentsData.length} assignments`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
