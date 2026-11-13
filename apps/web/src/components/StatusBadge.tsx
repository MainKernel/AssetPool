import { clsx } from 'clsx';

import styles from './StatusBadge.module.css';

export type EntityStatus =
  'AVAILABLE' | 'ISSUED' | 'WRITTEN_OFF' | 'PENDING' | 'ACTIVE' | 'RETURNED' | 'REJECTED';

const STATUS_META: Record<EntityStatus, { label: string; tone: keyof typeof styles }> = {
  AVAILABLE: { label: 'Доступно', tone: 'available' },
  ISSUED: { label: 'Видано', tone: 'issued' },
  WRITTEN_OFF: { label: 'Списано', tone: 'writtenOff' },
  PENDING: { label: 'Очікує', tone: 'pending' },
  ACTIVE: { label: 'Активна', tone: 'issued' },
  RETURNED: { label: 'Повернено', tone: 'returned' },
  REJECTED: { label: 'Відхилено', tone: 'writtenOff' },
};

export interface StatusBadgeProps {
  status: EntityStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx(styles.badge, styles[meta.tone], className)}>
      <span className={styles.dot} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}
