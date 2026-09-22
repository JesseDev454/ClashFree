import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { fetchDepartmentReport, fetchUniversityReport } from '../api/activity'
import { fetchPublishedDepartment, fetchPublishedMine } from '../api/timetables'
import { RequireAuth } from '../components/RequireAuth'
import { ForbiddenPage } from '../pages/ForbiddenPage'
import { HomeRedirect } from '../pages/HomeRedirect'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AcademicSessionsPage } from '../pages/admin/AcademicSessionsPage'
import { AdminHomePage } from '../pages/admin/AdminHomePage'
import { ChangeReviewPage } from '../pages/admin/ChangeReviewPage'
import { ConflictMonitorPage } from '../pages/admin/ConflictMonitorPage'
import { DisruptionCentrePage } from '../pages/admin/DisruptionCentrePage'
import { ConstraintWeightsPage } from '../pages/admin/ConstraintWeightsPage'
import { CourseAssignmentsPage } from '../pages/admin/CourseAssignmentsPage'
import { CoursesPage } from '../pages/admin/CoursesPage'
import { FacultiesDepartmentsPage } from '../pages/admin/FacultiesDepartmentsPage'
import { GenerateTimetablePage } from '../pages/admin/GenerateTimetablePage'
import { GenerationResultsPage } from '../pages/admin/GenerationResultsPage'
import { LecturersPage } from '../pages/admin/LecturersPage'
import { MasterTimetablePage } from '../pages/admin/MasterTimetablePage'
import { PublishTimetablePage } from '../pages/admin/PublishTimetablePage'
import { RepairComparisonPage } from '../pages/admin/RepairComparisonPage'
import { RepairTimetablePage } from '../pages/admin/RepairTimetablePage'
import { RoomsFacilitiesPage } from '../pages/admin/RoomsFacilitiesPage'
import { AuditLogPage } from '../pages/admin/AuditLogPage'
import { UsersRolesPage } from '../pages/admin/UsersRolesPage'
import { SchedulingConstraintsPage } from '../pages/admin/SchedulingConstraintsPage'
import { StudentCohortsPage } from '../pages/admin/StudentCohortsPage'
import { TimetableVersionsPage } from '../pages/admin/TimetableVersionsPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { ResetSuccessPage } from '../pages/auth/ResetSuccessPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { ConflictReviewPage } from '../pages/coordinator/ConflictReviewPage'
import { CoordinatorHomePage } from '../pages/coordinator/CoordinatorHomePage'
import { CoordinatorLecturerAvailabilityPage } from '../pages/coordinator/CoordinatorLecturerAvailabilityPage'
import { DepartmentAssignmentsPage } from '../pages/coordinator/DepartmentAssignmentsPage'
import { DepartmentCohortsPage } from '../pages/coordinator/DepartmentCohortsPage'
import { DepartmentConstraintsPage } from '../pages/coordinator/DepartmentConstraintsPage'
import { DepartmentCoursesPage } from '../pages/coordinator/DepartmentCoursesPage'
import { FacilityHistoryPage } from '../pages/facilities/FacilityHistoryPage'
import { FacilitiesRoomEditPage } from '../pages/facilities/FacilitiesRoomEditPage'
import { FacilitiesRoomsPage } from '../pages/facilities/FacilitiesRoomsPage'
import { RoomUtilizationPage } from '../pages/facilities/RoomUtilizationPage'
import { CoordinatorGeneratePage } from '../pages/coordinator/CoordinatorGeneratePage'
import { CoordinatorRepairPage } from '../pages/coordinator/CoordinatorRepairPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { FacilitiesHomePage } from '../pages/facilities/FacilitiesHomePage'
import { AffectedClassesPage } from '../pages/facilities/AffectedClassesPage'
import { MaintenanceSchedulePage } from '../pages/facilities/MaintenanceSchedulePage'
import { ReportDisruptionPage } from '../pages/facilities/ReportDisruptionPage'
import { RoomAvailabilityPage } from '../pages/facilities/RoomAvailabilityPage'
import { RoomStatusPage } from '../pages/facilities/RoomStatusPage'
import { LecturerAvailabilityPage } from '../pages/lecturer/LecturerAvailabilityPage'
import { LecturerHomePage } from '../pages/lecturer/LecturerHomePage'
import { MyCoursesPage } from '../pages/lecturer/MyCoursesPage'
import { LecturerPreferencesPage } from '../pages/lecturer/LecturerPreferencesPage'
import { ReportUnavailabilityPage } from '../pages/lecturer/ReportUnavailabilityPage'
import { AdminDashboardPage } from '../pages/preview/AdminDashboardPage'
import { ComponentGalleryPage } from '../pages/preview/ComponentGalleryPage'
import { AppUnavailablePage, UnavailablePage } from '../pages/preview/UnavailablePage'
import { CourseSchedulePage } from '../pages/student/CourseSchedulePage'
import { StudentHomePage } from '../pages/student/StudentHomePage'
import { TodayPage } from '../pages/student/TodayPage'
import { ChangesPage } from '../pages/shared/ChangesPage'
import { HelpPage } from '../pages/shared/HelpPage'
import { ProfilePage } from '../pages/shared/ProfilePage'
import { PublishedTimetablePage } from '../pages/shared/PublishedTimetablePage'
import { RequestsPage } from '../pages/shared/RequestsPage'
import { NotificationsPage } from '../pages/shared/NotificationsPage'
import { ReportsPage } from '../pages/shared/ReportsPage'
import { SettingsPage } from '../pages/shared/SettingsPage'

function AdminRoute({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['timetable_administrator']}>{children}</RequireAuth>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
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
        path="/admin/disruption-centre"
        element={
          <AdminRoute>
            <DisruptionCentrePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/repair-timetable"
        element={
          <AdminRoute>
            <RepairTimetablePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/repair-comparison"
        element={
          <AdminRoute>
            <RepairComparisonPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/publish-timetable"
        element={
          <AdminRoute>
            <PublishTimetablePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/timetable-versions"
        element={
          <AdminRoute>
            <TimetableVersionsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/change-review"
        element={
          <AdminRoute>
            <ChangeReviewPage />
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
        path="/lecturer/report-unavailability"
        element={
          <RequireAuth roles={['lecturer']}>
            <ReportUnavailabilityPage />
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
        path="/facilities/room-status"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <RoomStatusPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/report-disruption"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <ReportDisruptionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/affected-classes"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <AffectedClassesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/maintenance-schedule"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <MaintenanceSchedulePage />
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
        path="/admin/users-roles"
        element={
          <AdminRoute>
            <UsersRolesPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <SettingsPage description="Administrator display preferences. Email delivery is not active." />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/help-support"
        element={
          <AdminRoute>
            <HelpPage
              title="Administrator workflows"
              points={[
                'Maintain academic data, generate, review, repair, and publish.',
                'Users & Roles creates accounts for every role.',
                'Faculty or department generation keeps other published meetings locked.',
              ]}
            />
          </AdminRoute>
        }
      />
      <Route
        path="/coordinator/department-courses"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <DepartmentCoursesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/course-assignments"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <DepartmentAssignmentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/student-cohorts"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <DepartmentCohortsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/lecturer-availability"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <CoordinatorLecturerAvailabilityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/department-constraints"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <DepartmentConstraintsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/scheduling-requests"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <RequestsPage
              title="Scheduling Requests"
              description="Ask for room changes, extra classes, or reassignment."
              kind="scheduling"
              canDecide
            />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/department-timetable"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <PublishedTimetablePage
              title="Department Timetable"
              description="Published meetings for your department."
              load={fetchPublishedDepartment}
              emptyLabel="No published meetings for this department."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/conflict-review"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <ConflictReviewPage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/change-requests"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <RequestsPage
              title="Change Requests"
              description="Timetable-change requests for this department."
              kind="change"
              canDecide
            />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/profile"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <ProfilePage description="Your coordinator identity and department." />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/settings"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <SettingsPage description="Display preferences without university-wide controls." />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/help-support"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <HelpPage
              title="Coordinator workflows"
              points={[
                'Edit courses, cohorts, and assignments in your department only.',
                'Blocked periods are hard solver rules. Preferred periods are soft.',
                'Approve lecturer change requests from this department.',
              ]}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/my-timetable"
        element={
          <RequireAuth roles={['lecturer']}>
            <PublishedTimetablePage
              title="My Timetable"
              description="Your published teaching week."
              load={fetchPublishedMine}
              emptyLabel="No published meetings are assigned to you."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/my-courses"
        element={
          <RequireAuth roles={['lecturer']}>
            <MyCoursesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/change-requests"
        element={
          <RequireAuth roles={['lecturer']}>
            <RequestsPage
              title="Change Requests"
              description="Your timetable-change requests and their status."
              kind="change"
              canDecide={false}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/timetable-changes"
        element={
          <RequireAuth roles={['lecturer']}>
            <ChangesPage description="Published before-and-after changes that affect your classes." />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/profile"
        element={
          <RequireAuth roles={['lecturer']}>
            <ProfilePage description="Your lecturer identity and department." />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/settings"
        element={
          <RequireAuth roles={['lecturer']}>
            <SettingsPage description="Display and alert preferences." />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/help-support"
        element={
          <RequireAuth roles={['lecturer']}>
            <HelpPage
              title="Lecturer workflows"
              points={[
                'My Timetable shows only meetings assigned to you.',
                'Availability and preferences stay on their existing pages.',
                'Change requests go to your department coordinator.',
              ]}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/profile"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <ProfilePage description="Your facilities identity." />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/settings"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <SettingsPage description="Display preferences for the facilities workspace." />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/help-support"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <HelpPage
              title="Facilities workflows"
              points={[
                'Room status, availability, and disruptions stay on their existing pages.',
                'The dashboard counts rooms, open disruptions, and maintenance blocks.',
              ]}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/student/my-timetable"
        element={
          <RequireAuth roles={['student']}>
            <PublishedTimetablePage
              title="My Timetable"
              description="The published week for your cohort."
              load={fetchPublishedMine}
              emptyLabel="No published meetings for your cohort."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/student/today"
        element={
          <RequireAuth roles={['student']}>
            <TodayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/student/course-schedule"
        element={
          <RequireAuth roles={['student']}>
            <CourseSchedulePage />
          </RequireAuth>
        }
      />
      <Route
        path="/student/timetable-changes"
        element={
          <RequireAuth roles={['student']}>
            <ChangesPage description="Published changes that affect your cohort." />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reports-analytics"
        element={
          <AdminRoute>
            <ReportsPage
              title="Reports & Analytics"
              description="University meetings, utilization, changes, disruptions, and requests."
              load={fetchUniversityReport}
            />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <AdminRoute>
            <AuditLogPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <AdminRoute>
            <NotificationsPage
              title="Notifications"
              description="Alerts for timetable changes, requests, and disruptions."
            />
          </AdminRoute>
        }
      />
      <Route
        path="/coordinator/reports-analytics"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <ReportsPage
              title="Reports & Analytics"
              description="Meetings, utilization, changes, and requests for your department."
              load={fetchDepartmentReport}
            />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/notifications"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <NotificationsPage
              title="Notifications"
              description="Alerts for your department's requests and timetable changes."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/lecturer/notifications"
        element={
          <RequireAuth roles={['lecturer']}>
            <NotificationsPage
              title="Notifications"
              description="Alerts for your classes and change requests."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/generate-timetable"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <CoordinatorGeneratePage />
          </RequireAuth>
        }
      />
      <Route
        path="/coordinator/repair-timetable"
        element={
          <RequireAuth roles={['department_coordinator']}>
            <CoordinatorRepairPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/rooms"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <FacilitiesRoomsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/rooms/edit"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <FacilitiesRoomEditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/room-utilization"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <RoomUtilizationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/facility-history"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <FacilityHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/facilities/notifications"
        element={
          <RequireAuth roles={['facilities_manager']}>
            <NotificationsPage
              title="Notifications"
              description="Alerts for disruptions and maintenance that affect rooms."
            />
          </RequireAuth>
        }
      />
      <Route
        path="/student/notifications"
        element={
          <RequireAuth roles={['student']}>
            <NotificationsPage
              title="Notifications"
              description="Alerts when the published timetable changes for your cohort."
            />
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
