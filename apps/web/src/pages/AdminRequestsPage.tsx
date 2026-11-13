import type { Assignment } from '@assetpool/schema';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import {
  useAssignments,
  useDevicesInfinite,
  useIssueAssignment,
  useIssueDirect,
  useRejectAssignment,
  useUsers,
} from '../api/queries/index.js';
import {
  Button,
  DataTable,
  FormField,
  IconButton,
  LoadMoreButton,
  Modal,
  QueryState,
  Select,
  type DataTableColumn,
} from '../components/index.js';
import { formatDateTime } from '../utils/formatDate.js';
import styles from './Pages.module.css';

export function AdminRequestsPage() {
  const assignmentsQuery = useAssignments('PENDING');
  const availableDevicesQuery = useDevicesInfinite({ status: 'AVAILABLE' });
  const usersQuery = useUsers();

  const issueAssignment = useIssueAssignment();
  const rejectAssignment = useRejectAssignment();
  const issueDirect = useIssueDirect();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [directDeviceId, setDirectDeviceId] = useState('');
  const [directUserId, setDirectUserId] = useState('');

  useEffect(() => {
    document.title = 'Заявки на видачу — AssetPool';
  }, []);

  const items = assignmentsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const availableDevices = availableDevicesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const users = usersQuery.data ?? [];

  const handleIssue = (assignmentId: number) => {
    setBusyId(assignmentId);
    issueAssignment.mutate(assignmentId, {
      onSettled: () => setBusyId((prev) => (prev === assignmentId ? null : prev)),
    });
  };

  const handleReject = (assignmentId: number) => {
    setBusyId(assignmentId);
    rejectAssignment.mutate(assignmentId, {
      onSettled: () => setBusyId((prev) => (prev === assignmentId ? null : prev)),
    });
  };

  const handleDirectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const deviceId = Number(directDeviceId);
    const userId = Number(directUserId);
    if (!deviceId || !userId) return;

    issueDirect.mutate(
      { device_id: deviceId, user_id: userId },
      {
        onSuccess: () => {
          setDirectModalOpen(false);
          setDirectDeviceId('');
          setDirectUserId('');
        },
      },
    );
  };

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: 'user',
      header: 'Співробітник',
      render: (row) => row.user?.full_name ?? `Користувач #${row.user_id}`,
    },
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
      header: 'Інв. №',
      render: (row) => row.device?.inventory_number ?? '—',
    },
    {
      key: 'created_at',
      header: 'Дата заявки',
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'actions',
      header: 'Дії',
      render: (row) => {
        const isRowBusy = busyId === row.id;
        return (
          <div className={styles.tableActions}>
            <IconButton
              aria-label="Видати пристрій"
              title="Видати пристрій"
              disabled={isRowBusy}
              onClick={() => handleIssue(row.id)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </IconButton>
            <IconButton
              aria-label="Відхилити заявку"
              title="Відхилити заявку"
              disabled={isRowBusy}
              onClick={() => handleReject(row.id)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </IconButton>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Заявки на видачу</h1>
          <p className={styles.pageSubtitle}>Опрацювання черги заявок та пряма видача обладнання</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="primary" onClick={() => setDirectModalOpen(true)}>
            Пряма видача
          </Button>
        </div>
      </div>

      <QueryState
        isLoading={assignmentsQuery.isLoading}
        isError={assignmentsQuery.isError}
        errorMessage={getErrorMessage(assignmentsQuery.error, 'Не вдалося завантажити заявки')}
        onRetry={() => void assignmentsQuery.refetch()}
        empty={items.length === 0}
        emptyTitle="Черга заявок порожня"
        emptyDescription="Нові заявки від співробітників з'являться тут."
      >
        <DataTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          caption="Заявки в статусі очікування"
        />
        <LoadMoreButton
          hasNextPage={assignmentsQuery.hasNextPage}
          isFetchingNextPage={assignmentsQuery.isFetchingNextPage}
          onLoadMore={() => void assignmentsQuery.fetchNextPage()}
        />
      </QueryState>

      <Modal
        open={directModalOpen}
        onClose={() => setDirectModalOpen(false)}
        title="Пряма видача пристрою"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDirectModalOpen(false)}
              disabled={issueDirect.isPending}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              form="direct-issue-form"
              variant="primary"
              loading={issueDirect.isPending}
              disabled={!directDeviceId || !directUserId || issueDirect.isPending}
            >
              Видати
            </Button>
          </>
        }
      >
        <form id="direct-issue-form" className={styles.formStack} onSubmit={handleDirectSubmit}>
          <FormField id="direct-device" label="Доступний пристрій">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                required
                value={directDeviceId}
                onChange={(e) => setDirectDeviceId(e.target.value)}
              >
                <option value="">Оберіть пристрій...</option>
                {availableDevices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} ({dev.inventory_number})
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="direct-user" label="Співробітник">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                required
                value={directUserId}
                onChange={(e) => setDirectUserId(e.target.value)}
              >
                <option value="">Оберіть співробітника...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </form>
      </Modal>
    </div>
  );
}

export default AdminRequestsPage;
