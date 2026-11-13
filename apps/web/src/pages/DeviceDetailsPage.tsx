import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError, getErrorMessage } from '../api/errors.js';
import { useCreateAssignment, useDevice, useMyAssignments } from '../api/queries/index.js';
import { Button, GlassPanel, QueryState, StatusBadge } from '../components/index.js';
import { formatDateTime } from '../utils/formatDate.js';
import { NotFoundPage } from './NotFoundPage.js';
import styles from './Pages.module.css';

export function DeviceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const deviceId = Number(id);
  const isValidId = Number.isInteger(deviceId) && deviceId > 0;

  const deviceQuery = useDevice(deviceId);
  const myAssignmentsQuery = useMyAssignments();
  const createAssignment = useCreateAssignment();

  const device = deviceQuery.data;

  useEffect(() => {
    document.title = device ? `${device.name} — AssetPool` : 'Деталі пристрою — AssetPool';
  }, [device]);

  const hasPendingAssignment = useMemo(() => {
    const list = myAssignmentsQuery.data?.pages.flatMap((page) => page.data) ?? [];
    return list.some((item) => item.device_id === deviceId && item.status === 'PENDING');
  }, [deviceId, myAssignmentsQuery.data]);

  if (!isValidId || (deviceQuery.error instanceof ApiError && deviceQuery.error.status === 404)) {
    return <NotFoundPage />;
  }

  const canRequest =
    Boolean(device) &&
    device?.status === 'AVAILABLE' &&
    !hasPendingAssignment &&
    !createAssignment.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <Link to="/catalog" className={styles.inlineLink}>
            ← Назад до каталогу
          </Link>
          <h1 className={styles.pageTitle} style={{ marginTop: 'var(--space-2)' }}>
            {device?.name ?? 'Деталі пристрою'}
          </h1>
        </div>
      </div>

      <QueryState
        isLoading={deviceQuery.isLoading}
        isError={deviceQuery.isError}
        errorMessage={getErrorMessage(deviceQuery.error, 'Не вдалося завантажити дані пристрою')}
        onRetry={() => void deviceQuery.refetch()}
        empty={!device}
      >
        {device && (
          <GlassPanel className={styles.detailsPanel}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}
            >
              <span className={styles.detailsLabel}>Інв. № {device.inventory_number}</span>
              <StatusBadge status={device.status} />
            </div>

            <dl className={styles.detailsList}>
              <div>
                <dt className={styles.detailsLabel}>Назва</dt>
                <dd className={styles.detailsValue}>{device.name}</dd>
              </div>
              <div>
                <dt className={styles.detailsLabel}>Категорія</dt>
                <dd className={styles.detailsValue}>{device.category.name}</dd>
              </div>
              <div>
                <dt className={styles.detailsLabel}>Інвентарний номер</dt>
                <dd className={styles.detailsValue}>{device.inventory_number}</dd>
              </div>
              <div>
                <dt className={styles.detailsLabel}>Додано до реєстру</dt>
                <dd className={styles.detailsValue}>{formatDateTime(device.created_at)}</dd>
              </div>
            </dl>

            <div className={styles.headerActions}>
              <Button
                variant="primary"
                disabled={!canRequest}
                loading={createAssignment.isPending}
                onClick={() => createAssignment.mutate(device.id)}
              >
                {hasPendingAssignment
                  ? 'Заявку вже подано'
                  : device.status !== 'AVAILABLE'
                    ? 'Недоступно для замовлення'
                    : 'Подати заявку'}
              </Button>
            </div>
          </GlassPanel>
        )}
      </QueryState>
    </div>
  );
}

export default DeviceDetailsPage;
