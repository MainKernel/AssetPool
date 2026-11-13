import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  children: ReactNode;
}

export function IconButton({ className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={clsx(styles.iconButton, className)} {...rest}>
      {children}
    </button>
  );
}
