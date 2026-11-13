import type { Category } from '@assetpool/schema';
import { useEffect, useState, type FormEvent } from 'react';

import { getErrorMessage } from '../api/errors.js';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../api/queries/index.js';
import {
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  IconButton,
  Input,
  Modal,
  QueryState,
  type DataTableColumn,
} from '../components/index.js';
import styles from './Pages.module.css';

export function AdminCategoriesPage() {
  const categoriesQuery = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    document.title = 'Категорії — AssetPool';
  }, []);

  const categories = categoriesQuery.data ?? [];

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
    };

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, body: payload },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createCategory.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: 'Назва',
      render: (row) => row.name,
    },
    {
      key: 'description',
      header: 'Опис',
      render: (row) => row.description ?? '—',
    },
    {
      key: 'devices_count',
      header: 'Кількість пристроїв',
      render: (row) => row.devices_count ?? 0,
    },
    {
      key: 'actions',
      header: 'Дії',
      render: (row) => (
        <div className={styles.tableActions}>
          <IconButton
            aria-label="Редагувати категорію"
            title="Редагувати категорію"
            onClick={() => openEdit(row)}
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
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
            Видалити
          </Button>
        </div>
      ),
    },
  ];

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Категорії обладнання</h1>
          <p className={styles.pageSubtitle}>Керування категоріями активів підприємства</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="primary" onClick={openCreate}>
            + Додати категорію
          </Button>
        </div>
      </div>

      <QueryState
        isLoading={categoriesQuery.isLoading}
        isError={categoriesQuery.isError}
        errorMessage={getErrorMessage(categoriesQuery.error, 'Не вдалося завантажити категорії')}
        onRetry={() => void categoriesQuery.refetch()}
        empty={categories.length === 0}
        emptyTitle="Категорій ще немає"
        emptyDescription="Створіть першу категорію для групування пристроїв."
      >
        <DataTable
          columns={columns}
          data={categories}
          getRowKey={(row) => row.id}
          caption="Список категорій"
        />
      </QueryState>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Редагувати категорію' : 'Нова категорія'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Скасувати
            </Button>
            <Button
              type="submit"
              form="category-form"
              variant="primary"
              loading={isSaving}
              disabled={isSaving}
            >
              {editingCategory ? 'Зберегти' : 'Створити'}
            </Button>
          </>
        }
      >
        <form id="category-form" className={styles.formStack} onSubmit={handleSubmit}>
          <FormField id="category-name" label="Назва">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                minLength={2}
                placeholder="Наприклад: Планшети"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>
          <FormField id="category-description" label="Опис (необов'язково)">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="Короткий опис категорії"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCategory.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          });
        }}
        title="Видалити категорію"
        message={`Видалити категорію «${deleteTarget?.name ?? ''}»? Якщо в категорії є прив'язані пристрої, сервер поверне помилку 409 і видалення буде відхилено.`}
        confirmLabel="Видалити"
        loading={deleteCategory.isPending}
      />
    </div>
  );
}

export default AdminCategoriesPage;
