import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { GuestOnlyRoute, ProtectedRoute, RoleRoute } from './RouteGuards.js';

const LoginPage = lazy(() => import('../pages/LoginPage.js'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.js'));
const CatalogPage = lazy(() => import('../pages/CatalogPage.js'));
const DeviceDetailsPage = lazy(() => import('../pages/DeviceDetailsPage.js'));
const MyDevicesPage = lazy(() => import('../pages/MyDevicesPage.js'));
const AdminRequestsPage = lazy(() => import('../pages/AdminRequestsPage.js'));
const AdminAssetsPage = lazy(() => import('../pages/AdminAssetsPage.js'));
const AdminCategoriesPage = lazy(() => import('../pages/AdminCategoriesPage.js'));
const AdminHistoryPage = lazy(() => import('../pages/AdminHistoryPage.js'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.js'));

export function AppRouter() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route element={<GuestOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:id" element={<DeviceDetailsPage />} />

            <Route element={<RoleRoute requiredRole="EMPLOYEE" />}>
              <Route path="/my-devices" element={<MyDevicesPage />} />
            </Route>

            <Route element={<RoleRoute requiredRole="ADMIN" />}>
              <Route path="/admin/requests" element={<AdminRequestsPage />} />
              <Route path="/admin/assets" element={<AdminAssetsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/history" element={<AdminHistoryPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
