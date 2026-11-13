import styles from './Loading.module.css';

export interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Завантаження…' }: LoadingSpinnerProps) {
  return (
    <div className={styles.spinnerWrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
