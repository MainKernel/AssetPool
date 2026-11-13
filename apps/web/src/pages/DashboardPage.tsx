import type { Assignment, Device } from '@assetpool/schema';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import {
  useAssignments,
  useDashboardStats,
  useMyAssignments,
  useMyDevices,
} from '../api/queries/index.js';
import {
  DataTable,
  DeviceCard,
  GlassPanel,
  QueryState,
  StatusBadge,
  type DataTableColumn,
} from '../components/index.js';
import { useAuth } from '../features/auth/AuthProvider.js';
import { formatDateTime } from '../utils/formatDate.js';
import styles from './Pages.module.css';

function AdminDashboard() {
  const statsQuery = useDashboardStats();
  const pendingQuery = useAssignments('PENDING');

  const pendingItems = pendingQuery.data?.pages.flatMap((page) => page.data) ?? [];

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
      header: 'Інв. номер',
      render: (row) => row.device?.inventory_number ?? '—',
    },
    {
      key: 'created_at',
      header: 'Дата заявки',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <QueryState
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
        errorMessage={getErrorMessage(statsQuery.error, 'Не вдалося завантажити статистику')}
        onRetry={() => void statsQuery.refetch()}
        empty={!statsQuery.data}
      >
        {statsQuery.data && (
          <div className={styles.statsGrid}>
            <GlassPanel className={styles.statCard}>
              <span className={styles.statLabel}>Доступно на складі</span>
              <span className={styles.statValue}>{statsQuery.data.devices_available ?? 0}</span>
            </GlassPanel>
            <GlassPanel className={styles.statCard}>
              <span className={styles.statLabel}>Видано співробітникам</span>
              <span className={styles.statValue}>{statsQuery.data.devices_issued ?? 0}</span>
            </GlassPanel>
            <GlassPanel className={styles.statCard}>
              <span className={styles.statLabel}>Списано</span>
              <span className={styles.statValue}>{statsQuery.data.devices_written_off ?? 0}</span>
            </GlassPanel>
            <GlassPanel className={styles.statCard}>
              <span className={styles.statLabel}>Нові заявки</span>
              <span className={styles.statValue}>{statsQuery.data.pending_requests ?? 0}</span>
              <Link to="/admin/requests" className={styles.inlineLink}>
                Перейти до заявок →
              </Link>
            </GlassPanel>
          </div>
        )}
      </QueryState>

      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <h2 className={styles.sectionTitle}>Останні заявки в очікуванні</h2>
          <Link to="/admin/requests" className={styles.inlineLink}>
            Усі заявки
          </Link>
        </div>

        <QueryState
          isLoading={pendingQuery.isLoading}
          isError={pendingQuery.isError}
          errorMessage={getErrorMessage(pendingQuery.error, 'Не вдалося завантажити заявки')}
          onRetry={() => void pendingQuery.refetch()}
          empty={pendingItems.length === 0}
          emptyTitle="Немає активних заявок"
          emptyDescription="Усі вхідні заявки вже опрацьовано."
        >
          <DataTable
            columns={columns}
            data={pendingItems.slice(0, 5)}
            getRowKey={(row) => row.id}
            caption="Останні заявки на видачу"
          />
        </QueryState>
      </section>
    </>
  );
}

function EmployeeDashboard() {
  const statsQuery = useDashboardStats();
  const myDevicesQuery = useMyDevices();
  const myAssignmentsQuery = useMyAssignments();

  const myDevices: Device[] = myDevicesQuery.data ?? [];
  const myAssignments = myAssignmentsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const assignmentColumns: DataTableColumn<Assignment>[] = [
    {
      key: 'device',
      header: 'Пристрій',
      render: (row) => (
        <Link to={`/catalog/${row.device_id}`} className={styles.inlineLink}>
          {row.device?.name ?? `Пристрій #${row.device_id}`}
        </Link>
      ),
    },
    {
      key: 'inventory',
      header: 'Інв. номер',
      render: (row) => row.device?.inventory_number ?? '—',
    },
    {
      key: 'created_at',
      header: 'Створено',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      {statsQuery.data && (
        <div className={styles.statsGrid}>
          <GlassPanel className={styles.statCard}>
            <span className={styles.statLabel}>Мої пристрої</span>
            <span className={styles.statValue}>{statsQuery.data.my_devices_count ?? 0}</span>
          </GlassPanel>
          <GlassPanel className={styles.statCard}>
            <span className={styles.statLabel}>Заявки в очікуванні</span>
            <span className={styles.statValue}>{statsQuery.data.my_pending_count ?? 0}</span>
          </GlassPanel>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <h2 className={styles.sectionTitle}>Мої пристрої</h2>
          <Link to="/catalog" className={styles.inlineLink}>
            Обрати в каталозі →
          </Link>
        </div>

        <QueryState
          isLoading={myDevicesQuery.isLoading}
          isError={myDevicesQuery.isError}
          errorMessage={getErrorMessage(
            myDevicesQuery.error,
            'Не вдалося завантажити ваші пристрої',
          )}
          onRetry={() => void myDevicesQuery.refetch()}
          empty={myDevices.length === 0}
          emptyTitle="Закріплених пристроїв немає"
          emptyDescription="Перейдіть до каталогу, щоб подати заявку на обладнання."
        >
          <div className={styles.cardsGrid}>
            {myDevices.map((device) => (
              <DeviceCard
                key={device.id}
                name={device.name}
                inventoryNumber={device.inventory_number}
                categoryName={device.category.name}
                status={device.status}
                actions={
                  <Link to={`/catalog/${device.id}`} className={styles.inlineLink}>
                    Детальніше
                  </Link>
                }
              />
            ))}
          </div>
        </QueryState>
      </section>

      <section className={styles.section}>
        <div className={styles.pageHeader}>
          <h2 className={styles.sectionTitle}>Активні та останні заявки</h2>
          <Link to="/my-devices" className={styles.inlineLink}>
            Уся історія →
          </Link>
        </div>

        <QueryState
          isLoading={myAssignmentsQuery.isLoading}
          isError={myAssignmentsQuery.isError}
          errorMessage={getErrorMessage(myAssignmentsQuery.error, 'Не вдалося завантажити заявки')}
          onRetry={() => void myAssignmentsQuery.refetch()}
          empty={myAssignments.length === 0}
          emptyTitle="Заявок ще немає"
          emptyDescription="Подані заявки на обладнання відображатимуться тут."
        >
          <DataTable
            columns={assignmentColumns}
            data={myAssignments.slice(0, 6)}
            getRowKey={(row) => row.id}
            caption="Мої заявки"
          />
        </QueryState>
      </section>
    </>
  );
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    document.title = 'Головна — AssetPool';
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Вітаємо, {user?.full_name ?? 'користувачу'}</h1>
          <p className={styles.pageSubtitle}>
            {isAdmin
              ? 'Огляд стану обладнання та черги заявок'
              : 'Ваше закріплене обладнання та статуси заявок'}
          </p>
        </div>
      </div>

      {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}

export default DashboardPage;
