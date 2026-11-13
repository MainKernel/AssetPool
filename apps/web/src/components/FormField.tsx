import type { ReactNode } from 'react';

import styles from './FormControls.module.css';

export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
  }) => ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        'aria-describedby': error ? errorId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
