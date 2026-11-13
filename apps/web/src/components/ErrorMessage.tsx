import { clsx } from 'clsx';

import { Button } from './Button.js';
import styles from './StateMessage.module.css';

export interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = 'Не вдалося завантажити дані',
  message = 'Виникла помилка під час звернення до сервера.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className={styles.container} role="alert">
      <p className={clsx(styles.title, styles.errorTitle)}>{title}</p>
      <p className={styles.description}>{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Повторити
        </Button>
      )}
    </div>
  );
}
