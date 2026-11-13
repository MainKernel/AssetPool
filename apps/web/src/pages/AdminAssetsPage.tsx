import type { Device, Schemas } from '@assetpool/schema';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import {
  useAssignments,
  useCategories,
  useCreateDevice,
  useDeleteDevice,
  useDevicesInfinite,
  useReturnAssignment,
  useUpdateDevice,
  useWriteOffDevice,
} from '../api/queries/index.js';
import { useDebouncedValue } from '../api/useDebouncedValue.js';
import {
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  IconButton,
  Input,
  LoadMoreButton,
  Modal,
  QueryState,
  SearchInput,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../components/index.js';
import styles from './Pages.module.css';

type DeviceStatus = Schemas['DeviceStatus'];

const STATUS_OPTIONS: Array<{ value: '' | DeviceStatus; label: string }> = [
  { value: '', label: 'Усі статуси' },
  { value: 'AVAILABLE', label: 'Доступно' },
  { value: 'ISSUED', label: 'Видано' },
  { value: 'WRITTEN_OFF', label: 'Списано' },
];

export function AdminAssetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const selectedCategoryId = searchParams.get('categoryId')
    ? Number(searchParams.get('categoryId'))
    : undefined;
  const rawStatus = searchParams.get('status');
  const selectedStatus: DeviceStatus | undefined =
    rawStatus === 'AVAILABLE' || rawStatus === 'ISSUED' || rawStatus === 'WRITTEN_OFF'
      ? rawStatus
      : undefined;

  useEffect(() => {
    document.title = 'Управління активами — AssetPool';
  }, []);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch.trim()) {
          next.set('search', debouncedSearch.trim());
        } else {
          next.delete('search');
        }
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const categoriesQuery = useCategories();
  const devicesQuery = useDevicesInfinite({
    categoryId: selectedCategoryId,
    search: debouncedSearch.trim() || undefined,
    status: selectedStatus,
  });
  const activeAssignmentsQuery = useAssignments('ACTIVE');

  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const writeOffDevice = useWriteOffDevice();
  const deleteDevice = useDeleteDevice();
  const returnAssignment = useReturnAssignment();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [name, setName] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [writeOffTarget, setWriteOffTarget] = useState<Device | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const activeAssignmentByDevice = useMemo(() => {
    const map = new Map<number, number>();
    const list = activeAssignmentsQuery.data?.pages.flatMap((p) => p.data) ?? [];
    for (const item of list) {
      map.set(item.device_id, item.id);
    }
    return map;
  }, [activeAssignmentsQuery.data]);

  const devices = devicesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const categories = categoriesQuery.data ?? [];

  const openCreateModal = () => {
    setEditingDevice(null);
    setName('');
    setInventoryNumber('');
    setCategoryId(categories[0] ? String(categories[0].id) : '');
    setFormOpen(true);
  };

  const openEditModal = (device: Device) => {
    setEditingDevice(device);
    setName(device.name);
    setInventoryNumber(device.inventory_number);
    setCategoryId(String(device.category_id));
    setFormOpen(true);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedCategoryId = Number(categoryId);
    if (!parsedCategoryId) return;

    if (editingDevice) {
      updateDevice.mutate(
        {
          id: editingDevice.id,
          body: {
            name: name.trim(),
            inventory_number: inventoryNumber.trim(),
            category_id: parsedCategoryId,
          },
        },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createDevice.mutate(
        {
          name: name.trim(),
          inventory_number: inventoryNumber.trim(),
          category_id: parsedCategoryId,
        },
        { onSuccess: () => setFormOpen(false) },
      );
    }
  };

  const columns: DataTableColumn<Device>[] = [
    {
      key: 'name',
      header: 'Назва',
      render: (row) => (
        <Link to={`/catalog/${row.id}`} className={styles.inlineLink}>
          {row.name}
        </Link>
      ),
    },
    {
      key: 'inventory_number',
      header: 'Інв. номер',
      render: (row) => row.inventory_number,
    },
    {
      key: 'category',
      header: 'Категорія',
      render: (row) => row.category.name,
    },
    {
      key: 'status',
      header: 'Статус',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Дії',
      render: (row) => {
        const activeAssignmentId = activeAssignmentByDevice.get(row.id);

        return (
          <div className={styles.tableActions}>
            <IconButton
              aria-label="Редагувати пристрій"
              title="Редагувати пристрій"
              onClick={() => openEditModal(row)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </IconButton>

            {row.status === 'ISSUED' && activeAssignmentId && (
              <Button
                size="sm"
                variant="ghost"
                disabled={returnAssignment.isPending}
                onClick={() => returnAssignment.mutate(activeAssignmentId)}
              >
                Повернути на склад
              </Button>
            )}

            {row.status !== 'WRITTEN_OFF' && (
              <Button size="sm" variant="ghost" onClick={() => setWriteOffTarget(row)}>
                Списати
              </Button>
            )}

            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
              Видалити
            </Button>

            <Link to={`/admin/history?deviceId=${row.id}`} className={styles.inlineLink}>
              Історія
            </Link>
          </div>
        );
      },
    },
  ];

  const isSaving = createDevice.isPending || updateDevice.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Управління активами</h1>
          <p className={styles.pageSubtitle}>Реєстр пристроїв, повернення на склад та списання</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="primary" onClick={openCreateModal}>
            + Додати актив
          </Button>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div style={{ flex: '1 1 240px' }}>
          <SearchInput
            aria-label="Пошук за інвентарним номером або назвою"
            placeholder="Пошук за інв. номером або назвою..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClear={() => setSearchInput('')}
          />
        </div>

        <div style={{ minWidth: '180px' }}>
          <Select
            aria-label="Фільтр за категорією"
            value={selectedCategoryId ? String(selectedCategoryId) : ''}
            onChange={(e) =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.value) next.set('categoryId', e.target.value);
                  else next.delete('categoryId');
                  return next;
                },
                { replace: true },
              )
            }
          >
            <option value="">Усі категорії</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ minWidth: '160px' }}>
          <Select
            aria-label="Фільтр за статусом"
            value={selectedStatus ?? ''}
            onChange={(e) =>
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.value) next.set('status', e.target.value);
                  else next.delete('status');
                  return next;
                },
                { replace: true },
              )
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <QueryState
        isLoading={devicesQuery.isLoading}
        isError={devicesQuery.isError}
        errorMessage={getErrorMessage(devicesQuery.error, 'Не вдалося завантажити активи')}
        onRetry={() => void devicesQuery.refetch()}
        empty={devices.length === 0}
        emptyTitle="Активів не знайдено"
        emptyDescription="Додайте новий пристрій або змініть параметри пошуку."
      >
        <DataTable
          columns={columns}
          data={devices}
          getRowKey={(row) => row.id}
          caption="Таблиця всіх пристроїв"
        />
        <LoadMoreButton
          hasNextPage={devicesQuery.hasNextPage}
          isFetchingNextPage={devicesQuery.isFetchingNextPage}
          onLoadMore={() => void devicesQuery.fetchNextPage()}
        />
      </QueryState>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingDevice ? 'Редагувати актив' : 'Додати актив'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Скасувати
            </Button>
            <Button
              type="submit"
              form="asset-form"
              variant="primary"
              loading={isSaving}
              disabled={isSaving}
            >
              {editingDevice ? 'Зберегти' : 'Додати'}
            </Button>
          </>
        }
      >
        <form id="asset-form" className={styles.formStack} onSubmit={handleFormSubmit}>
          <FormField id="asset-category" label="Категорія">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Оберіть категорію...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="asset-name" label="Назва пристрою">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                minLength={2}
                placeholder="Lenovo ThinkPad T14 Gen 4"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="asset-inv" label="Інвентарний номер">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                minLength={2}
                placeholder="INV-2026-0042"
                value={inventoryNumber}
                onChange={(e) => setInventoryNumber(e.target.value)}
              />
            )}
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(writeOffTarget)}
        onClose={() => setWriteOffTarget(null)}
        onConfirm={() => {
          if (!writeOffTarget) return;
          writeOffDevice.mutate(writeOffTarget.id, {
            onSuccess: () => setWriteOffTarget(null),
          });
        }}
        title="Списання пристрою"
        message={`Списати пристрій «${writeOffTarget?.name ?? ''}» (${writeOffTarget?.inventory_number ?? ''})? Дія незворотна.`}
        confirmLabel="Списати"
        loading={writeOffDevice.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteDevice.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          });
        }}
        title="Видалення пристрою"
        message={`Видалити пристрій «${deleteTarget?.name ?? ''}»? Видалення можливе лише якщо пристрій не має історії видач.`}
        confirmLabel="Видалити"
        loading={deleteDevice.isPending}
      />
    </div>
  );
}

export default AdminAssetsPage;
