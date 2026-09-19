import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { HomeRedirect } from '../pages/HomeRedirect'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminHomePage } from '../pages/admin/AdminHomePage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { ResetSuccessPage } from '../pages/auth/ResetSuccessPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { CoordinatorHomePage } from '../pages/coordinator/CoordinatorHomePage'
import { FacilitiesHomePage } from '../pages/facilities/FacilitiesHomePage'
import { LecturerHomePage } from '../pages/lecturer/LecturerHomePage'
import { AdminDashboardPage } from '../pages/preview/AdminDashboardPage'
import { ComponentGalleryPage } from '../pages/preview/ComponentGalleryPage'
import { AppUnavailablePage, UnavailablePage } from '../pages/preview/UnavailablePage'
import { StudentHomePage } from '../pages/student/StudentHomePage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/reset-success" element={<ResetSuccessPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth roles={['timetable_administrator']}>
            <AdminHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/dashboard"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <CoordinatorHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/dashboard"
        element={
          <RequireAuth roles={['lecturer']}>
            <LecturerHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/dashboard"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <FacilitiesHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/student/dashboard"
        element={
          <RequireAuth roles={['student']}>
            <StudentHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/unavailable/:pageId"
        element={
          <RequireAuth>
            <AppUnavailablePage />
          </RequireAuth>
        }
      />
      <Route path="/preview/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/preview/components" element={<ComponentGalleryPage />} />
      <Route path="/preview/unavailable/:pageId" element={<UnavailablePage />} />
      <Route
        path="/preview"
        element={<Navigate to="/preview/admin/dashboard" replace />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
