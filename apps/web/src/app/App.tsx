import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { FullPageSpinner } from '../components/Feedback';
import { Layout } from '../components/Layout';
import { NotFoundPage } from '../pages/NotFoundPage';

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const RequestsPage = lazy(() => import('../pages/RequestsPage').then((module) => ({ default: module.RequestsPage })));
const NewRequestPage = lazy(() => import('../pages/NewRequestPage').then((module) => ({ default: module.NewRequestPage })));
const RequestDetailPage = lazy(() => import('../pages/RequestDetailPage').then((module) => ({ default: module.RequestDetailPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const UsersPage = lazy(() => import('../pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const ClientsPage = lazy(() => import('../pages/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const TechniciansPage = lazy(() => import('../pages/TechniciansPage').then((module) => ({ default: module.TechniciansPage })));
const CatalogsPage = lazy(() => import('../pages/CatalogsPage').then((module) => ({ default: module.CatalogsPage })));

export function App() {
  return (
    <Suspense fallback={<FullPageSpinner label="Cargando módulo…" />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/solicitudes" element={<RequestsPage />} />
          <Route
            path="/solicitudes/nueva"
            element={
              <RequireAuth roles={['CLIENTE', 'COORDINADOR', 'ADMIN']}>
                <NewRequestPage />
              </RequireAuth>
            }
          />
          <Route path="/solicitudes/:id" element={<RequestDetailPage />} />
          <Route path="/notificaciones" element={<NotificationsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />

          <Route
            path="/admin/usuarios"
            element={
              <RequireAuth roles={['ADMIN']}>
                <UsersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/clientes"
            element={
              <RequireAuth roles={['ADMIN', 'COORDINADOR']}>
                <ClientsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/tecnicos"
            element={
              <RequireAuth roles={['ADMIN', 'COORDINADOR']}>
                <TechniciansPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/catalogos"
            element={
              <RequireAuth roles={['ADMIN', 'COORDINADOR']}>
                <CatalogsPage />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
