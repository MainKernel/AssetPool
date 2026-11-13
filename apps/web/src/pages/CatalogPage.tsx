import type { Schemas } from '@assetpool/schema';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { getErrorMessage } from '../api/errors.js';
import {
  useCategories,
  useCreateAssignment,
  useDevicesInfinite,
  useMyAssignments,
} from '../api/queries/index.js';
import { useDebouncedValue } from '../api/useDebouncedValue.js';
import {
  Button,
  DeviceCard,
  GlassPanel,
  LoadMoreButton,
  QueryState,
  SearchInput,
  Select,
  useInfiniteScroll,
} from '../components/index.js';
import styles from './Pages.module.css';

type DeviceStatus = Schemas['DeviceStatus'];

const DEVICE_STATUSES: Array<{ value: '' | DeviceStatus; label: string }> = [
  { value: '', label: 'Усі статуси' },
  { value: 'AVAILABLE', label: 'Доступно' },
  { value: 'ISSUED', label: 'Видано' },
  { value: 'WRITTEN_OFF', label: 'Списано' },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') ?? '';
  const urlCategoryId = searchParams.get('categoryId');
  const urlStatus = (searchParams.get('status') as DeviceStatus | null) ?? '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const selectedCategoryId = urlCategoryId ? Number(urlCategoryId) : undefined;
  const selectedStatus: DeviceStatus | undefined =
    urlStatus === 'AVAILABLE' || urlStatus === 'ISSUED' || urlStatus === 'WRITTEN_OFF'
      ? urlStatus
      : undefined;

  useEffect(() => {
    document.title = 'Каталог пристроїв — AssetPool';
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
  const myAssignmentsQuery = useMyAssignments();
  const createAssignment = useCreateAssignment();

  const pendingDeviceIds = useMemo(() => {
    const items = myAssignmentsQuery.data?.pages.flatMap((p) => p.data) ?? [];
    return new Set(items.filter((a) => a.status === 'PENDING').map((a) => a.device_id));
  }, [myAssignmentsQuery.data]);

  const devices = useMemo(
    () => devicesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [devicesQuery.data],
  );

  const handleCategoryChange = (categoryId?: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (categoryId) {
          next.set('categoryId', String(categoryId));
        } else {
          next.delete('categoryId');
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleStatusChange = (status: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (status) {
          next.set('status', status);
        } else {
          next.delete('status');
        }
        return next;
      },
      { replace: true },
    );
  };

  const sentinelRef = useInfiniteScroll(
    Boolean(devicesQuery.hasNextPage && !devicesQuery.isFetchingNextPage),
    () => void devicesQuery.fetchNextPage(),
  );

  const categories = categoriesQuery.data ?? [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Каталог пристроїв</h1>
          <p className={styles.pageSubtitle}>Оберіть доступне обладнання та подайте заявку</p>
        </div>
      </div>

      <div className={styles.catalogLayout}>
        <aside className={styles.catalogSidebar} aria-label="Фільтр категорій">
          <GlassPanel style={{ padding: 'var(--space-3)' }}>
            <h2 className={styles.sectionTitle}>Категорії</h2>
            <ul className={styles.categoryList}>
              <li>
                <button
                  type="button"
                  className={`${styles.categoryButton} ${!selectedCategoryId ? styles.categoryButtonActive : ''}`}
                  onClick={() => handleCategoryChange(undefined)}
                >
                  <span>Усі категорії</span>
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`${styles.categoryButton} ${selectedCategoryId === cat.id ? styles.categoryButtonActive : ''}`}
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    <span>{cat.name}</span>
                    {typeof cat.devices_count === 'number' && <span>{cat.devices_count}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </aside>

        <div className={styles.catalogMain}>
          <div className={styles.filtersBar}>
            <div style={{ flex: '1 1 240px' }}>
              <SearchInput
                aria-label="Пошук за назвою або інвентарним номером"
                placeholder="Пошук за назвою або інв. №..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onClear={() => setSearchInput('')}
              />
            </div>

            <div className={styles.mobileCategorySelect} style={{ minWidth: '180px' }}>
              <Select
                aria-label="Фільтр за категорією"
                value={selectedCategoryId ? String(selectedCategoryId) : ''}
                onChange={(e) =>
                  handleCategoryChange(e.target.value ? Number(e.target.value) : undefined)
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
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {DEVICE_STATUSES.map((opt) => (
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
            errorMessage={getErrorMessage(
              devicesQuery.error,
              'Не вдалося завантажити каталог пристроїв',
            )}
            onRetry={() => void devicesQuery.refetch()}
            empty={devices.length === 0}
            emptyTitle="Пристроїв не знайдено"
            emptyDescription="Спробуйте змінити параметри пошуку або фільтр категорій."
          >
            <div className={styles.cardsGrid}>
              {devices.map((device) => {
                const isPendingByMe = pendingDeviceIds.has(device.id);
                const isDisabled =
                  device.status !== 'AVAILABLE' || isPendingByMe || createAssignment.isPending;

                return (
                  <DeviceCard
                    key={device.id}
                    name={device.name}
                    inventoryNumber={device.inventory_number}
                    categoryName={device.category.name}
                    status={device.status}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isDisabled}
                          onClick={() => createAssignment.mutate(device.id)}
                        >
                          {isPendingByMe ? 'Заявку подано' : 'Замовити'}
                        </Button>
                        <Link to={`/catalog/${device.id}`} className={styles.inlineLink}>
                          Детальніше
                        </Link>
                      </>
                    }
                  />
                );
              })}
            </div>

            <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

            <LoadMoreButton
              hasNextPage={devicesQuery.hasNextPage}
              isFetchingNextPage={devicesQuery.isFetchingNextPage}
              onLoadMore={() => void devicesQuery.fetchNextPage()}
            />
          </QueryState>
        </div>
      </div>
    </div>
  );
}

export default CatalogPage;
