import { clsx } from 'clsx';
import type { ReactNode, SelectHTMLAttributes } from 'react';

import styles from './FormControls.module.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  children: ReactNode;
}

export function Select({ hasError = false, className, children, ...rest }: SelectProps) {
  return (
    <select className={clsx(styles.control, hasError && styles.controlError, className)} {...rest}>
      {children}
    </select>
  );
}
