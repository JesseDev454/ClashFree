# ClashFree Page Inventory

Machine-readable source: `frontend/src/config/pageInventory.ts`.
Reference images: `docs/design-references/` (78 PNGs, original filenames and pixel sizes preserved).

Preview-only routes (not counted in the 78):

| Route | Purpose | Phase |
| --- | --- | --- |
| `/preview/admin/dashboard` | Runnable administrator dashboard assembled from shared components | 0 |
| `/preview/components` | Component gallery | 0 |
| `/preview/unavailable/:pageId` | Explains that a production screen belongs to a later phase | 0 |

Production route prefixes: `/auth`, `/admin`, `/coordinator`, `/lecturer`, `/facilities`, `/student`.

## Authentication — 5 screens

| ID | Title | Route | Roles | Phase | Reference |
| --- | --- | --- | --- | --- | --- |
| auth-login | Login | `/auth/login` | unauthenticated | 2 | `01_Authentication/login.png` (1182×1144) |
| auth-forgot-password | Forgot Password | `/auth/forgot-password` | unauthenticated | 2 | `01_Authentication/forgot-password.png` (778×924) |
| auth-verify-email | Verify Email | `/auth/verify-email` | unauthenticated | 2 | `01_Authentication/verify-email.png` (778×924) |
| auth-reset-password | Reset Password | `/auth/reset-password` | unauthenticated | 2 | `01_Authentication/reset-password.png` (778×924) |
| auth-reset-success | Reset Successful | `/auth/reset-success` | unauthenticated | 2 | `01_Authentication/reset-success.png` (780×924) |

## Timetable Administrator — 26 screens

| ID | Title | Route | Phase | Capabilities |
| --- | --- | --- | --- | --- |
| admin-dashboard | Dashboard | `/admin/dashboard` | 0 | view, generate |
| admin-academic-sessions | Academic Sessions | `/admin/academic-sessions` | 3 | view, edit |
| admin-faculties-departments | Faculties & Departments | `/admin/faculties-departments` | 3 | view, edit |
| admin-courses | Courses | `/admin/courses` | 3 | view, edit |
| admin-student-cohorts | Student Cohorts | `/admin/student-cohorts` | 3 | view, edit |
| admin-lecturers | Lecturers | `/admin/lecturers` | 3 | view, edit |
| admin-rooms-facilities | Rooms & Facilities | `/admin/rooms-facilities` | 3 | view, edit |
| admin-course-assignments | Course Assignments | `/admin/course-assignments` | 3 | view, edit |
| admin-scheduling-constraints | Scheduling Constraints | `/admin/scheduling-constraints` | 4 | view, edit |
| admin-constraint-weights | Constraint Weights | `/admin/constraint-weights` | 4 | view, edit |
| admin-generate-timetable | Generate Timetable | `/admin/generate-timetable` | 5 | view, generate |
| admin-generation-results | Generation Results | `/admin/generation-results` | 5 | view |
| admin-master-timetable | Master Timetable | `/admin/master-timetable` | 5 | view |
| admin-conflict-monitor | Conflict Monitor | `/admin/conflict-monitor` | 5 | view |
| admin-disruption-centre | Disruption Centre | `/admin/disruption-centre` | 7 | view, reportDisruption |
| admin-repair-timetable | Repair Timetable | `/admin/repair-timetable` | 8 | view, approveRepair |
| admin-repair-comparison | Repair Comparison | `/admin/repair-comparison` | 8 | view, approveRepair |
| admin-change-review | Change Review | `/admin/change-review` | 6 | view, approveRepair, publish |
| admin-publish-timetable | Publish Timetable | `/admin/publish-timetable` | 6 | view, publish |
| admin-timetable-versions | Timetable Versions | `/admin/timetable-versions` | 6 | view |
| admin-reports-analytics | Reports & Analytics | `/admin/reports-analytics` | 10 | view |
| admin-users-roles | Users & Roles | `/admin/users-roles` | 9 | view, edit |
| admin-audit-log | Audit Log | `/admin/audit-log` | 10 | view |
| admin-notifications | Notifications | `/admin/notifications` | 10 | view |
| admin-settings | Settings | `/admin/settings` | 9 | view, edit |
| admin-help-support | Help & Support | `/admin/help-support` | 9 | view |

Administrator role only. Scope: university.

## Department Coordinator — 15 screens

Department-scoped. Capabilities are view/edit and `submitRequest` where noted. No generate, approveRepair or publish.

| ID | Title | Route | Phase |
| --- | --- | --- | --- |
| coordinator-dashboard | Dashboard | `/coordinator/dashboard` | 9 |
| coordinator-department-courses | Department Courses | `/coordinator/department-courses` | 9 |
| coordinator-course-assignments | Course Assignments | `/coordinator/course-assignments` | 9 |
| coordinator-student-cohorts | Student Cohorts | `/coordinator/student-cohorts` | 9 |
| coordinator-lecturer-availability | Lecturer Availability | `/coordinator/lecturer-availability` | 9 |
| coordinator-department-constraints | Department Constraints | `/coordinator/department-constraints` | 9 |
| coordinator-scheduling-requests | Scheduling Requests | `/coordinator/scheduling-requests` | 9 |
| coordinator-department-timetable | Department Timetable | `/coordinator/department-timetable` | 9 |
| coordinator-conflict-review | Conflict Review | `/coordinator/conflict-review` | 9 |
| coordinator-change-requests | Change Requests | `/coordinator/change-requests` | 9 |
| coordinator-reports-analytics | Reports & Analytics | `/coordinator/reports-analytics` | 10 |
| coordinator-notifications | Notifications | `/coordinator/notifications` | 10 |
| coordinator-profile | Profile | `/coordinator/profile` | 9 |
| coordinator-settings | Settings | `/coordinator/settings` | 9 |
| coordinator-help-support | Help & Support | `/coordinator/help-support` | 9 |

## Lecturer — 12 screens

Personal teaching scope.

| ID | Title | Route | Phase |
| --- | --- | --- | --- |
| lecturer-dashboard | Dashboard | `/lecturer/dashboard` | 9 |
| lecturer-my-timetable | My Timetable | `/lecturer/my-timetable` | 9 |
| lecturer-my-courses | My Courses | `/lecturer/my-courses` | 9 |
| lecturer-availability | Availability | `/lecturer/availability` | 4 |
| lecturer-scheduling-preferences | Scheduling Preferences | `/lecturer/scheduling-preferences` | 4 |
| lecturer-report-unavailability | Report Unavailability | `/lecturer/report-unavailability` | 7 |
| lecturer-change-requests | Change Requests | `/lecturer/change-requests` | 9 |
| lecturer-timetable-changes | Timetable Changes | `/lecturer/timetable-changes` | 9 |
| lecturer-notifications | Notifications | `/lecturer/notifications` | 10 |
| lecturer-profile | Profile | `/lecturer/profile` | 9 |
| lecturer-settings | Settings | `/lecturer/settings` | 9 |
| lecturer-help-support | Help & Support | `/lecturer/help-support` | 9 |

## Facilities Manager — 14 screens

Room and facility scope. `reportDisruption` on disruption and maintenance screens. No generate/publish.

| ID | Title | Route | Phase |
| --- | --- | --- | --- |
| facilities-dashboard | Dashboard | `/facilities/dashboard` | 9 |
| facilities-rooms | Rooms | `/facilities/rooms` | 3 |
| facilities-add-edit-room | Add / Edit Room | `/facilities/rooms/edit` | 3 |
| facilities-room-availability | Room Availability | `/facilities/room-availability` | 4 |
| facilities-room-status | Room Status | `/facilities/room-status` | 7 |
| facilities-report-disruption | Report Disruption | `/facilities/report-disruption` | 7 |
| facilities-affected-classes | Affected Classes | `/facilities/affected-classes` | 7 |
| facilities-maintenance-schedule | Maintenance Schedule | `/facilities/maintenance-schedule` | 7 |
| facilities-room-utilization | Room Utilization | `/facilities/room-utilization` | 10 |
| facilities-facility-history | Facility History | `/facilities/facility-history` | 10 |
| facilities-notifications | Notifications | `/facilities/notifications` | 10 |
| facilities-profile | Profile | `/facilities/profile` | 9 |
| facilities-settings | Settings | `/facilities/settings` | 9 |
| facilities-help-support | Help & Support | `/facilities/help-support` | 9 |

## Student — 6 screens

Read-only personal schedule.

| ID | Title | Route | Phase |
| --- | --- | --- | --- |
| student-dashboard | Dashboard | `/student/dashboard` | 9 |
| student-my-timetable | My Timetable | `/student/my-timetable` | 9 |
| student-todays-schedule | Today's Schedule | `/student/today` | 9 |
| student-course-schedule | Course Schedule | `/student/course-schedule` | 9 |
| student-timetable-changes | Timetable Changes | `/student/timetable-changes` | 9 |
| student-notifications | Notifications | `/student/notifications` | 10 |

## Counts

- Authentication: 5
- Administrator: 26
- Coordinator: 15
- Lecturer: 12
- Facilities: 14
- Student: 6
- **Total: 78**
