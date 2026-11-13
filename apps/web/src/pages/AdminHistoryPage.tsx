import type { Assignment } from '@assetpool/schema';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import { useDevicesInfinite, useHistory, useUsers } from '../api/queries/index.js';
import {
  Button,
  DataTable,
  LoadMoreButton,
  QueryState,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../components/index.js';
import { useToast } from '../components/ToastContext.js';
import { tokenStore } from '../features/auth/tokenStore.js';
import { formatDateTime } from '../utils/formatDate.js';
import styles from './Pages.module.css';

export function AdminHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useToast();
  const [exporting, setExporting] = useState(false);

  const selectedDeviceId = searchParams.get('deviceId')
    ? Number(searchParams.get('deviceId'))
    : undefined;
  const selectedUserId = searchParams.get('userId')
    ? Number(searchParams.get('userId'))
    : undefined;

  useEffect(() => {
    document.title = 'Історія руху — AssetPool';
  }, []);

  const historyQuery = useHistory({
    deviceId: selectedDeviceId,
    userId: selectedUserId,
  });
  const devicesQuery = useDevicesInfinite();
  const usersQuery = useUsers();

  const items = historyQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const devices = devicesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const users = usersQuery.data ?? [];

  const handleFilterChange = (key: 'deviceId' | 'userId', value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams();
      if (selectedDeviceId) query.set('deviceId', String(selectedDeviceId));
      if (selectedUserId) query.set('userId', String(selectedUserId));
      const qs = query.toString();
      const url = `/api/history/export.csv${qs ? `?${qs}` : ''}`;

      const token = tokenStore.get();
      const response = await fetch(url, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'assetpool-history.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      showError(getErrorMessage(err, 'Не вдалося експортувати CSV'));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: 'user',
      header: 'Співробітник',
      render: (row) => row.user?.full_name ?? `#${row.user_id}`,
    },
    {
      key: 'device',
      header: 'Пристрій',
      render: (row) => row.device?.name ?? `#${row.device_id}`,
    },
    {
      key: 'inventory',
      header: 'Інв. №',
      render: (row) => row.device?.inventory_number ?? '—',
    },
    {
      key: 'assigned_at',
      header: 'Видано',
      render: (row) => formatDateTime(row.assigned_at ?? row.created_at),
    },
    {
      key: 'returned_at',
      header: 'Повернено',
      render: (row) => formatDateTime(row.returned_at),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Журнал руху обладнання</h1>
          <p className={styles.pageSubtitle}>Історія видач та повернень із можливістю експорту</p>
        </div>
        <div className={`${styles.headerActions} no-print`}>
          <Button variant="ghost" loading={exporting} onClick={() => void handleExportCsv()}>
            Експорт CSV
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            Друк
          </Button>
        </div>
      </div>

      <div className={`${styles.filtersBar} no-print`}>
        <div style={{ minWidth: '220px' }}>
          <Select
            aria-label="Фільтр за пристроєм"
            value={selectedDeviceId ? String(selectedDeviceId) : ''}
            onChange={(e) => handleFilterChange('deviceId', e.target.value)}
          >
            <option value="">Усі пристрої</option>
            {devices.map((dev) => (
              <option key={dev.id} value={dev.id}>
                {dev.name} ({dev.inventory_number})
              </option>
            ))}
          </Select>
        </div>

        <div style={{ minWidth: '220px' }}>
          <Select
            aria-label="Фільтр за співробітником"
            value={selectedUserId ? String(selectedUserId) : ''}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
          >
            <option value="">Усі співробітники</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <QueryState
        isLoading={historyQuery.isLoading}
        isError={historyQuery.isError}
        errorMessage={getErrorMessage(historyQuery.error, 'Не вдалося завантажити журнал руху')}
        onRetry={() => void historyQuery.refetch()}
        empty={items.length === 0}
        emptyTitle="Записів історії не знайдено"
        emptyDescription="Історія руху з'явиться після першої видачі обладнання."
      >
        <DataTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          caption="Журнал руху обладнання"
        />
        <div className="no-print">
          <LoadMoreButton
            hasNextPage={historyQuery.hasNextPage}
            isFetchingNextPage={historyQuery.isFetchingNextPage}
            onLoadMore={() => void historyQuery.fetchNextPage()}
          />
        </div>
      </QueryState>
    </div>
  );
}

export default AdminHistoryPage;
