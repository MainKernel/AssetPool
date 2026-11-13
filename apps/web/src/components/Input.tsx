import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

import styles from './FormControls.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function Input({ hasError = false, className, ...rest }: InputProps) {
  return (
    <input className={clsx(styles.control, hasError && styles.controlError, className)} {...rest} />
  );
}
