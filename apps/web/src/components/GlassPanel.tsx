import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

import styles from './GlassPanel.module.css';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  strong?: boolean;
}

export function GlassPanel({ children, strong = false, className, ...rest }: GlassPanelProps) {
  return (
    <div className={clsx(styles.panel, strong && styles.strong, className)} {...rest}>
      {children}
    </div>
  );
}
