import { clsx } from 'clsx';

import styles from './Loading.module.css';

export interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
}

export function Skeleton({ height = '1rem', width = '100%', className }: SkeletonProps) {
  return (
    <div
      className={clsx(styles.skeleton, className)}
      style={{ height, width }}
      role="status"
      aria-label="Завантаження вмісту"
    />
  );
}
