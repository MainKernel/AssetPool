import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { GlassPanel } from '../components/index.js';
import styles from './Pages.module.css';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Сторінку не знайдено — AssetPool';
  }, []);

  return (
    <div style={{ padding: 'var(--space-6) 0' }}>
      <GlassPanel style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
        <h1 className={styles.pageTitle}>404 — Сторінку не знайдено</h1>
        <p className={styles.pageSubtitle} style={{ marginBottom: 'var(--space-4)' }}>
          Запитана адреса не існує або була видалена.
        </p>
        <Link to="/" className={styles.inlineLink}>
          На головну
        </Link>
      </GlassPanel>
    </div>
  );
}

export default NotFoundPage;
