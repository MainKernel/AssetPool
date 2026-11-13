import type { Assignment } from '@assetpool/schema';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import { useMyAssignments, useMyDevices } from '../api/queries/index.js';
import {
  DataTable,
  DeviceCard,
  LoadMoreButton,
  QueryState,
  StatusBadge,
  type DataTableColumn,
} from '../components/index.js';
import { formatDateTime } from '../utils/formatDate.js';
import styles from './Pages.module.css';

export function MyDevicesPage() {
  const myDevicesQuery = useMyDevices();
  const myAssignmentsQuery = useMyAssignments();

  useEffect(() => {
    document.title = 'Мої пристрої — AssetPool';
  }, []);

  const devices = myDevicesQuery.data ?? [];
  const assignments = myAssignmentsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const columns: DataTableColumn<Assignment>[] = [
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
      header: 'Подано',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'assigned_at',
      header: 'Видано',
      render: (row) => formatDateTime(row.assigned_at),
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
          <h1 className={styles.pageTitle}>Мої пристрої</h1>
          <p className={styles.pageSubtitle}>Обладнання у вашому користуванні та історія заявок</p>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Закріплені за мною</h2>
        <QueryState
          isLoading={myDevicesQuery.isLoading}
          isError={myDevicesQuery.isError}
          errorMessage={getErrorMessage(
            myDevicesQuery.error,
            'Не вдалося завантажити закріплені пристрої',
          )}
          onRetry={() => void myDevicesQuery.refetch()}
          empty={devices.length === 0}
          emptyTitle="Закріплених пристроїв немає"
          emptyDescription="Подайте заявку в каталозі, щоб отримати обладнання."
        >
          <div className={styles.cardsGrid}>
            {devices.map((device) => (
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
        <h2 className={styles.sectionTitle}>Мої заявки</h2>
        <QueryState
          isLoading={myAssignmentsQuery.isLoading}
          isError={myAssignmentsQuery.isError}
          errorMessage={getErrorMessage(myAssignmentsQuery.error, 'Не вдалося завантажити заявки')}
          onRetry={() => void myAssignmentsQuery.refetch()}
          empty={assignments.length === 0}
          emptyTitle="Історія заявок порожня"
          emptyDescription="Усі створені вами заявки відображатимуться тут."
        >
          <DataTable
            columns={columns}
            data={assignments}
            getRowKey={(row) => row.id}
            caption="Історія моїх заявок"
          />
          <LoadMoreButton
            hasNextPage={myAssignmentsQuery.hasNextPage}
            isFetchingNextPage={myAssignmentsQuery.isFetchingNextPage}
            onLoadMore={() => void myAssignmentsQuery.fetchNextPage()}
          />
        </QueryState>
      </section>
    </div>
  );
}

export default MyDevicesPage;
