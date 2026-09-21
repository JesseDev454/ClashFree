import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from '../components/RequireAuth'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { HomeRedirect } from '../pages/HomeRedirect'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AcademicSessionsPage } from '../pages/admin/AcademicSessionsPage'
import { AdminHomePage } from '../pages/admin/AdminHomePage'
import { ConflictMonitorPage } from '../pages/admin/ConflictMonitorPage'
import { ConstraintWeightsPage } from '../pages/admin/ConstraintWeightsPage'
import { CourseAssignmentsPage } from '../pages/admin/CourseAssignmentsPage'
import { CoursesPage } from '../pages/admin/CoursesPage'
import { FacultiesDepartmentsPage } from '../pages/admin/FacultiesDepartmentsPage'
import { GenerateTimetablePage } from '../pages/admin/GenerateTimetablePage'
import { GenerationResultsPage } from '../pages/admin/GenerationResultsPage'
import { LecturersPage } from '../pages/admin/LecturersPage'
import { MasterTimetablePage } from '../pages/admin/MasterTimetablePage'
import { RoomsFacilitiesPage } from '../pages/admin/RoomsFacilitiesPage'
import { SchedulingConstraintsPage } from '../pages/admin/SchedulingConstraintsPage'
import { StudentCohortsPage } from '../pages/admin/StudentCohortsPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { ResetSuccessPage } from '../pages/auth/ResetSuccessPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { CoordinatorHomePage } from '../pages/coordinator/CoordinatorHomePage'
import { FacilitiesHomePage } from '../pages/facilities/FacilitiesHomePage'
import { RoomAvailabilityPage } from '../pages/facilities/RoomAvailabilityPage'
import { LecturerAvailabilityPage } from '../pages/lecturer/LecturerAvailabilityPage'
import { LecturerHomePage } from '../pages/lecturer/LecturerHomePage'
import { LecturerPreferencesPage } from '../pages/lecturer/LecturerPreferencesPage'
import { AdminDashboardPage } from '../pages/preview/AdminDashboardPage'
import { ComponentGalleryPage } from '../pages/preview/ComponentGalleryPage'
import { AppUnavailablePage, UnavailablePage } from '../pages/preview/UnavailablePage'
import { StudentHomePage } from '../pages/student/StudentHomePage'

function AdminRoute({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['timetable_administrator']}>{children}</RequireAuth>
}

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
          <AdminRoute>
            <AdminHomePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/academic-sessions"
        element={
          <AdminRoute>
            <AcademicSessionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/faculties-departments"
        element={
          <AdminRoute>
            <FacultiesDepartmentsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <AdminRoute>
            <CoursesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/student-cohorts"
        element={
          <AdminRoute>
            <StudentCohortsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/lecturers"
        element={
          <AdminRoute>
            <LecturersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/rooms-facilities"
        element={
          <AdminRoute>
            <RoomsFacilitiesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/course-assignments"
        element={
          <AdminRoute>
            <CourseAssignmentsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/scheduling-constraints"
        element={
          <AdminRoute>
            <SchedulingConstraintsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/constraint-weights"
        element={
          <AdminRoute>
            <ConstraintWeightsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/generate-timetable"
        element={
          <AdminRoute>
            <GenerateTimetablePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/generation-results"
        element={
          <AdminRoute>
            <GenerationResultsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/master-timetable"
        element={
          <AdminRoute>
            <MasterTimetablePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/conflict-monitor"
        element={
          <AdminRoute>
            <ConflictMonitorPage />
          </AdminRoute>
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
        path="/lecturer/availability"
        element={
          <RequireAuth roles={['lecturer']}>
            <LecturerAvailabilityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/scheduling-preferences"
        element={
          <RequireAuth roles={['lecturer']}>
            <LecturerPreferencesPage />
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
        path="/facilities/room-availability"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <RoomAvailabilityPage />
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
