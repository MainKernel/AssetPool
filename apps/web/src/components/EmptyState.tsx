import type { ReactNode } from 'react';

import styles from './StateMessage.module.css';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = 'Нічого не знайдено',
  description = 'За обраними критеріями записів не виявлено.',
  action,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {action}
    </div>
  );
}
