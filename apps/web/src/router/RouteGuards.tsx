import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { useAuth } from '../features/auth/AuthProvider.js';
import { AppLayout } from '../layouts/AppLayout.js';

export function ProtectedRoute() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner label="Перевірка сесії…" />;
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return (
    <AppLayout userName={user.full_name} userRole={user.role} onLogout={() => void logout()}>
      <Outlet />
    </AppLayout>
  );
}

export function GuestOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner label="Завантаження…" />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ requiredRole }: { requiredRole: 'ADMIN' | 'EMPLOYEE' }) {
  const { user } = useAuth();

  if (!user || user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
