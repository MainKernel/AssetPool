import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '../components/Button.js';
import { GlassPanel } from '../components/GlassPanel.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--space-5)', maxWidth: '520px', margin: '4rem auto' }}>
          <GlassPanel>
            <h1 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>
              Виникла помилка відображення
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Спробуйте оновити сторінку або повернутися на головну.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button onClick={() => window.location.assign('/')}>На головну</Button>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Оновити
              </Button>
            </div>
          </GlassPanel>
        </div>
      );
    }

    return this.props.children;
  }
}
