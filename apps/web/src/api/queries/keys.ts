export interface DevicesFilter {
  categoryId?: number;
  search?: string;
  status?: 'AVAILABLE' | 'ISSUED' | 'WRITTEN_OFF';
}

export interface HistoryFilter {
  deviceId?: number;
  userId?: number;
}

export const queryKeys = {
  categories: ['categories'] as const,
  devices: {
    all: ['devices'] as const,
    list: (filters: DevicesFilter) => ['devices', 'list', filters] as const,
    detail: (id: number) => ['devices', 'detail', id] as const,
    history: (id: number) => ['devices', 'history', id] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    list: (status?: 'PENDING' | 'ACTIVE' | 'RETURNED' | 'REJECTED') =>
      ['assignments', 'list', status ?? 'PENDING'] as const,
  },
  users: {
    all: ['users'] as const,
    myDevices: ['users', 'me', 'devices'] as const,
    myAssignments: ['users', 'me', 'assignments'] as const,
  },
  history: {
    all: ['history'] as const,
    list: (filters: HistoryFilter) => ['history', 'list', filters] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
};
