import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { GlassPanel } from '../components/GlassPanel.js';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Сторінку не знайдено — AssetPool';
  }, []);

  return (
    <div style={{ padding: 'var(--space-5)', maxWidth: '480px', margin: '4rem auto' }}>
      <GlassPanel>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
          404 — Сторінку не знайдено
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Запитана сторінка не існує або була переміщена.
        </p>
        <Link to="/" style={{ color: 'var(--accent)', fontWeight: 500 }}>
          Повернутися на головну →
        </Link>
      </GlassPanel>
    </div>
  );
}
