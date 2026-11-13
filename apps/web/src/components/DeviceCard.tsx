import type { ReactNode } from 'react';

import styles from './DeviceCard.module.css';
import { GlassPanel } from './GlassPanel.js';
import { StatusBadge, type EntityStatus } from './StatusBadge.js';

export interface DeviceCardProps {
  name: string;
  inventoryNumber: string;
  categoryName: string;
  status: Extract<EntityStatus, 'AVAILABLE' | 'ISSUED' | 'WRITTEN_OFF'>;
  actions?: ReactNode;
}

export function DeviceCard({
  name,
  inventoryNumber,
  categoryName,
  status,
  actions,
}: DeviceCardProps) {
  return (
    <GlassPanel className={styles.card}>
      <div>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <StatusBadge status={status} />
        </div>
        <div className={styles.meta}>
          <span className={styles.inv}>{inventoryNumber}</span>
          <span>Категорія: {categoryName}</span>
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </GlassPanel>
  );
}
