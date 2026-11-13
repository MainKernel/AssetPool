import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

import styles from './FormControls.module.css';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  onClear?: () => void;
}

export function SearchInput({ value, onClear, className, ...rest }: SearchInputProps) {
  return (
    <div className={styles.searchWrap}>
      <span className={styles.searchIcon} aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        className={clsx(styles.control, styles.searchInput, className)}
        {...rest}
      />
      {value && onClear && (
        <button
          type="button"
          className={styles.clearBtn}
          aria-label="Очистити пошук"
          onClick={onClear}
        >
          ✕
        </button>
      )}
    </div>
  );
}
