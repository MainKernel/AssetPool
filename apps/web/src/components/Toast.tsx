import { clsx } from 'clsx';

import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={clsx(styles.toast, styles[toast.type])}>
          <span>{toast.message}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Закрити сповіщення"
            onClick={() => onDismiss(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
