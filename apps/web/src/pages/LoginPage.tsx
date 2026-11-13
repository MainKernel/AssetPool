import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ApiError, getErrorMessage } from '../api/errors.js';
import { Button, FormField, GlassPanel, Input } from '../components/index.js';
import { useAuth } from '../features/auth/AuthProvider.js';
import styles from './Pages.module.css';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = mode === 'login' ? 'Вхід — AssetPool' : 'Реєстрація — AssetPool';
  }, [mode]);

  const rawRedirect = searchParams.get('redirect');
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/';

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, fullName.trim());
      }
      void navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors?.length) {
          const nextFieldErrors: Record<string, string> = {};
          for (const item of err.errors) {
            nextFieldErrors[item.field] = item.message;
          }
          setFieldErrors(nextFieldErrors);
        }
        if (err.status === 401 && mode === 'login') {
          setErrorMessage(err.detail ?? 'Невірний логін або пароль');
        } else {
          setErrorMessage(getErrorMessage(err, 'Не вдалося виконати вхід'));
        }
      } else {
        setErrorMessage(getErrorMessage(err, 'Не вдалося виконати вхід'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.authWrap}>
      <GlassPanel className={styles.authCard} strong>
        <h1 className={styles.pageTitle} style={{ marginBottom: 'var(--space-2)' }}>
          AssetPool
        </h1>
        <p className={styles.pageSubtitle} style={{ marginBottom: 'var(--space-4)' }}>
          Облік та видача корпоративного обладнання
        </p>

        <div className={styles.authTabs} role="tablist" aria-label="Режим автентифікації">
          <Button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            variant={mode === 'login' ? 'primary' : 'ghost'}
            onClick={() => handleModeChange('login')}
          >
            Вхід
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            variant={mode === 'register' ? 'primary' : 'ghost'}
            onClick={() => handleModeChange('register')}
          >
            Реєстрація
          </Button>
        </div>

        <form className={styles.formStack} onSubmit={(e) => void handleSubmit(e)}>
          {errorMessage && (
            <div className={styles.formErrorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          {mode === 'register' && (
            <FormField id="auth-full-name" label="ПІБ" error={fieldErrors.full_name}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="text"
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Олександр Коваленко"
                  value={fullName}
                  hasError={Boolean(fieldErrors.full_name)}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}
            </FormField>
          )}

          <FormField id="auth-email" label="Електронна пошта" error={fieldErrors.email}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                required
                autoComplete="email"
                placeholder="name@assetpool.local"
                value={email}
                hasError={Boolean(fieldErrors.email)}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="auth-password" label="Пароль" error={fieldErrors.password}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'Мінімум 8 символів' : 'Введіть пароль'}
                value={password}
                hasError={Boolean(fieldErrors.password)}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>

          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            {mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </Button>
        </form>
      </GlassPanel>
    </main>
  );
}

export default LoginPage;
