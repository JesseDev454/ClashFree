import { getAppHref, getPreviewHref } from './pageInventory'
import type { NavGroup, PreviewUser } from '../types/navigation'
import type { Role } from '../types/permissions'

export const previewAdminUser: PreviewUser = {
  initials: 'TA',
  name: 'Timetable Administrator',
  roleLabel: 'Administrator',
  role: 'timetable_administrator',
  online: true,
}

export const adminNavGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'admin-dashboard',
        label: 'Dashboard',
        href: getPreviewHref('admin-dashboard'),
        icon: 'layout-dashboard',
        pageId: 'admin-dashboard',
      },
      {
        id: 'admin-academic-sessions',
        label: 'Academic Sessions',
        href: getPreviewHref('admin-academic-sessions'),
        icon: 'calendar-range',
        pageId: 'admin-academic-sessions',
      },
      {
        id: 'admin-faculties-departments',
        label: 'Faculties & Departments',
        href: getPreviewHref('admin-faculties-departments'),
        icon: 'building-2',
        pageId: 'admin-faculties-departments',
      },
      {
        id: 'admin-courses',
        label: 'Courses',
        href: getPreviewHref('admin-courses'),
        icon: 'book-open',
        pageId: 'admin-courses',
      },
      {
        id: 'admin-student-cohorts',
        label: 'Student Cohorts',
        href: getPreviewHref('admin-student-cohorts'),
        icon: 'users',
        pageId: 'admin-student-cohorts',
      },
      {
        id: 'admin-lecturers',
        label: 'Lecturers',
        href: getPreviewHref('admin-lecturers'),
        icon: 'user-round',
        pageId: 'admin-lecturers',
      },
      {
        id: 'admin-rooms-facilities',
        label: 'Rooms & Facilities',
        href: getPreviewHref('admin-rooms-facilities'),
        icon: 'door-open',
        pageId: 'admin-rooms-facilities',
      },
      {
        id: 'admin-course-assignments',
        label: 'Course Assignments',
        href: getPreviewHref('admin-course-assignments'),
        icon: 'git-merge',
        pageId: 'admin-course-assignments',
      },
      {
        id: 'admin-scheduling-constraints',
        label: 'Scheduling Constraints',
        href: getPreviewHref('admin-scheduling-constraints'),
        icon: 'sliders-horizontal',
        pageId: 'admin-scheduling-constraints',
      },
      {
        id: 'admin-constraint-weights',
        label: 'Constraint Weights',
        href: getPreviewHref('admin-constraint-weights'),
        icon: 'scale',
        pageId: 'admin-constraint-weights',
      },
      {
        id: 'admin-generate-timetable',
        label: 'Generate Timetable',
        href: getPreviewHref('admin-generate-timetable'),
        icon: 'play',
        pageId: 'admin-generate-timetable',
      },
      {
        id: 'admin-generation-results',
        label: 'Generation Results',
        href: getPreviewHref('admin-generation-results'),
        icon: 'chart-no-axes-combined',
        pageId: 'admin-generation-results',
      },
      {
        id: 'admin-master-timetable',
        label: 'Master Timetable',
        href: getPreviewHref('admin-master-timetable'),
        icon: 'calendar-days',
        pageId: 'admin-master-timetable',
      },
      {
        id: 'admin-conflict-monitor',
        label: 'Conflict Monitor',
        href: getPreviewHref('admin-conflict-monitor'),
        icon: 'triangle-alert',
        pageId: 'admin-conflict-monitor',
      },
      {
        id: 'admin-disruption-centre',
        label: 'Disruption Centre',
        href: getPreviewHref('admin-disruption-centre'),
        icon: 'zap',
        pageId: 'admin-disruption-centre',
      },
      {
        id: 'admin-repair-timetable',
        label: 'Repair Timetable',
        href: getPreviewHref('admin-repair-timetable'),
        icon: 'wrench',
        pageId: 'admin-repair-timetable',
      },
      {
        id: 'admin-repair-comparison',
        label: 'Repair Comparison',
        href: getPreviewHref('admin-repair-comparison'),
        icon: 'git-compare',
        pageId: 'admin-repair-comparison',
      },
      {
        id: 'admin-change-review',
        label: 'Timetable Change Review',
        href: getPreviewHref('admin-change-review'),
        icon: 'list-checks',
        pageId: 'admin-change-review',
      },
      {
        id: 'admin-publish-timetable',
        label: 'Publish Timetable',
        href: getPreviewHref('admin-publish-timetable'),
        icon: 'upload',
        pageId: 'admin-publish-timetable',
      },
      {
        id: 'admin-timetable-versions',
        label: 'Timetable Versions',
        href: getPreviewHref('admin-timetable-versions'),
        icon: 'history',
        pageId: 'admin-timetable-versions',
      },
      {
        id: 'admin-reports-analytics',
        label: 'Reports & Analytics',
        href: getPreviewHref('admin-reports-analytics'),
        icon: 'bar-chart-3',
        pageId: 'admin-reports-analytics',
      },
      {
        id: 'admin-users-roles',
        label: 'Users & Roles',
        href: getPreviewHref('admin-users-roles'),
        icon: 'shield',
        pageId: 'admin-users-roles',
      },
      {
        id: 'admin-audit-log',
        label: 'Audit Log',
        href: getPreviewHref('admin-audit-log'),
        icon: 'scroll-text',
        pageId: 'admin-audit-log',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'admin-notifications',
        label: 'Notifications',
        href: getPreviewHref('admin-notifications'),
        icon: 'bell',
        pageId: 'admin-notifications',
      },
      {
        id: 'admin-settings',
        label: 'Settings',
        href: getPreviewHref('admin-settings'),
        icon: 'settings',
        pageId: 'admin-settings',
      },
      {
        id: 'admin-help-support',
        label: 'Help & Support',
        href: getPreviewHref('admin-help-support'),
        icon: 'circle-help',
        pageId: 'admin-help-support',
      },
    ],
  },
]

function withAppHrefs(groups: NavGroup[]): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      href: item.pageId ? getAppHref(item.pageId) : item.href,
    })),
  }))
}

export const productionAdminNavGroups = withAppHrefs(adminNavGroups)

export const coordinatorNavGroups: NavGroup[] = withAppHrefs([
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'coordinator-dashboard',
        label: 'Dashboard',
        href: '',
        icon: 'layout-dashboard',
        pageId: 'coordinator-dashboard',
      },
      {
        id: 'coordinator-generate-timetable',
        label: 'Generate',
        href: '',
        icon: 'play',
        pageId: 'coordinator-generate-timetable',
      },
      {
        id: 'coordinator-repair-timetable',
        label: 'Repair',
        href: '',
        icon: 'wrench',
        pageId: 'coordinator-repair-timetable',
      },
      {
        id: 'coordinator-department-courses',
        label: 'Department Courses',
        href: '',
        icon: 'book-open',
        pageId: 'coordinator-department-courses',
      },
      {
        id: 'coordinator-course-assignments',
        label: 'Course Assignments',
        href: '',
        icon: 'git-merge',
        pageId: 'coordinator-course-assignments',
      },
      {
        id: 'coordinator-student-cohorts',
        label: 'Student Cohorts',
        href: '',
        icon: 'users',
        pageId: 'coordinator-student-cohorts',
      },
      {
        id: 'coordinator-lecturer-availability',
        label: 'Lecturer Availability',
        href: '',
        icon: 'user-round',
        pageId: 'coordinator-lecturer-availability',
      },
      {
        id: 'coordinator-department-constraints',
        label: 'Department Constraints',
        href: '',
        icon: 'sliders-horizontal',
        pageId: 'coordinator-department-constraints',
      },
      {
        id: 'coordinator-scheduling-requests',
        label: 'Scheduling Requests',
        href: '',
        icon: 'list-checks',
        pageId: 'coordinator-scheduling-requests',
      },
      {
        id: 'coordinator-department-timetable',
        label: 'Department Timetable',
        href: '',
        icon: 'calendar-days',
        pageId: 'coordinator-department-timetable',
      },
      {
        id: 'coordinator-conflict-review',
        label: 'Conflict Review',
        href: '',
        icon: 'triangle-alert',
        pageId: 'coordinator-conflict-review',
      },
      {
        id: 'coordinator-change-requests',
        label: 'Change Requests',
        href: '',
        icon: 'git-compare',
        pageId: 'coordinator-change-requests',
      },
      {
        id: 'coordinator-reports-analytics',
        label: 'Reports & Analytics',
        href: '',
        icon: 'bar-chart-3',
        pageId: 'coordinator-reports-analytics',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'coordinator-notifications',
        label: 'Notifications',
        href: '',
        icon: 'bell',
        pageId: 'coordinator-notifications',
      },
      {
        id: 'coordinator-profile',
        label: 'Profile',
        href: '',
        icon: 'user-round',
        pageId: 'coordinator-profile',
      },
      {
        id: 'coordinator-settings',
        label: 'Settings',
        href: '',
        icon: 'settings',
        pageId: 'coordinator-settings',
      },
      {
        id: 'coordinator-help-support',
        label: 'Help & Support',
        href: '',
        icon: 'circle-help',
        pageId: 'coordinator-help-support',
      },
    ],
  },
])

export const lecturerNavGroups: NavGroup[] = withAppHrefs([
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'lecturer-dashboard',
        label: 'Dashboard',
        href: '',
        icon: 'layout-dashboard',
        pageId: 'lecturer-dashboard',
      },
      {
        id: 'lecturer-my-timetable',
        label: 'My Timetable',
        href: '',
        icon: 'calendar-days',
        pageId: 'lecturer-my-timetable',
      },
      {
        id: 'lecturer-my-courses',
        label: 'My Courses',
        href: '',
        icon: 'book-open',
        pageId: 'lecturer-my-courses',
      },
      {
        id: 'lecturer-availability',
        label: 'Availability',
        href: '',
        icon: 'calendar-range',
        pageId: 'lecturer-availability',
      },
      {
        id: 'lecturer-scheduling-preferences',
        label: 'Scheduling Preferences',
        href: '',
        icon: 'sliders-horizontal',
        pageId: 'lecturer-scheduling-preferences',
      },
      {
        id: 'lecturer-report-unavailability',
        label: 'Report Unavailability',
        href: '',
        icon: 'triangle-alert',
        pageId: 'lecturer-report-unavailability',
      },
      {
        id: 'lecturer-change-requests',
        label: 'Change Requests',
        href: '',
        icon: 'list-checks',
        pageId: 'lecturer-change-requests',
      },
      {
        id: 'lecturer-timetable-changes',
        label: 'Timetable Changes',
        href: '',
        icon: 'history',
        pageId: 'lecturer-timetable-changes',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'lecturer-notifications',
        label: 'Notifications',
        href: '',
        icon: 'bell',
        pageId: 'lecturer-notifications',
      },
      {
        id: 'lecturer-profile',
        label: 'Profile',
        href: '',
        icon: 'user-round',
        pageId: 'lecturer-profile',
      },
      {
        id: 'lecturer-settings',
        label: 'Settings',
        href: '',
        icon: 'settings',
        pageId: 'lecturer-settings',
      },
      {
        id: 'lecturer-help-support',
        label: 'Help & Support',
        href: '',
        icon: 'circle-help',
        pageId: 'lecturer-help-support',
      },
    ],
  },
])

export const facilitiesNavGroups: NavGroup[] = withAppHrefs([
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'facilities-dashboard',
        label: 'Dashboard',
        href: '',
        icon: 'layout-dashboard',
        pageId: 'facilities-dashboard',
      },
      {
        id: 'facilities-rooms',
        label: 'Rooms',
        href: '',
        icon: 'door-open',
        pageId: 'facilities-rooms',
      },
      {
        id: 'facilities-room-availability',
        label: 'Room Availability',
        href: '',
        icon: 'calendar-range',
        pageId: 'facilities-room-availability',
      },
      {
        id: 'facilities-room-status',
        label: 'Room Status',
        href: '',
        icon: 'zap',
        pageId: 'facilities-room-status',
      },
      {
        id: 'facilities-report-disruption',
        label: 'Report Disruption',
        href: '',
        icon: 'triangle-alert',
        pageId: 'facilities-report-disruption',
      },
      {
        id: 'facilities-affected-classes',
        label: 'Affected Classes',
        href: '',
        icon: 'users',
        pageId: 'facilities-affected-classes',
      },
      {
        id: 'facilities-maintenance-schedule',
        label: 'Maintenance Schedule',
        href: '',
        icon: 'wrench',
        pageId: 'facilities-maintenance-schedule',
      },
      {
        id: 'facilities-room-utilization',
        label: 'Room Utilisation',
        href: '',
        icon: 'bar-chart-3',
        pageId: 'facilities-room-utilization',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'facilities-notifications',
        label: 'Notifications',
        href: '',
        icon: 'bell',
        pageId: 'facilities-notifications',
      },
      {
        id: 'facilities-profile',
        label: 'Profile',
        href: '',
        icon: 'user-round',
        pageId: 'facilities-profile',
      },
      {
        id: 'facilities-settings',
        label: 'Settings',
        href: '',
        icon: 'settings',
        pageId: 'facilities-settings',
      },
      {
        id: 'facilities-help-support',
        label: 'Help & Support',
        href: '',
        icon: 'circle-help',
        pageId: 'facilities-help-support',
      },
    ],
  },
])

export const studentNavGroups: NavGroup[] = withAppHrefs([
  {
    id: 'main',
    label: 'Main',
    items: [
      {
        id: 'student-dashboard',
        label: 'Dashboard',
        href: '',
        icon: 'layout-dashboard',
        pageId: 'student-dashboard',
      },
      {
        id: 'student-my-timetable',
        label: 'My Timetable',
        href: '',
        icon: 'calendar-days',
        pageId: 'student-my-timetable',
      },
      {
        id: 'student-todays-schedule',
        label: "Today's Schedule",
        href: '',
        icon: 'calendar-range',
        pageId: 'student-todays-schedule',
      },
      {
        id: 'student-course-schedule',
        label: 'Course Schedule',
        href: '',
        icon: 'book-open',
        pageId: 'student-course-schedule',
      },
      {
        id: 'student-timetable-changes',
        label: 'Timetable Changes',
        href: '',
        icon: 'history',
        pageId: 'student-timetable-changes',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'student-notifications',
        label: 'Notifications',
        href: '',
        icon: 'bell',
        pageId: 'student-notifications',
      },
    ],
  },
])

const NAV_BY_ROLE: Partial<Record<Role, NavGroup[]>> = {
  timetable_administrator: productionAdminNavGroups,
  department_coordinator: coordinatorNavGroups,
  lecturer: lecturerNavGroups,
  facilities_manager: facilitiesNavGroups,
  student: studentNavGroups,
}

export function navGroupsFor(role: Role): NavGroup[] {
  return NAV_BY_ROLE[role] ?? []
}

export function notificationsHrefFor(role: Role): string {
  const groups = navGroupsFor(role)
  const match = groups
    .flatMap((group) => group.items)
    .find((item) => item.id.endsWith('-notifications'))
  return match?.href ?? '/unavailable/admin-notifications'
}
