# ClashFree Design Specification — Precision Motion

This is the permanent design reference for ClashFree. Every phase builds on it; nothing is redesigned from scratch between phases. Tokens live in `frontend/src/index.css`, motion presets in `frontend/src/lib/motion.ts`. Components never repeat raw hex values.

**Tagline:** Smarter Timetables. Fewer Conflicts.
**Direction:** Precision Motion — Linear's precision, Vercel's restraint, calendar-grade scheduling usability, Raycast-fast interactions. Intelligent, calm, confident, precise.

Living reference: `/preview/components` renders the brand, tokens, type scale, motion table and every component listed below.

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Visual foundation: brand, tokens, type, spacing, components, shell, navigation, motion | Done |
| 2 | Signature screens: Administrator Dashboard, Master Timetable, Repair Studio | Done |
| 3 | Administrator experience (sessions, departments, courses, lecturers, rooms, constraints, generation wizard, conflicts, requests, publication, reports, users) | Next |
| 4–7 | Coordinator, Lecturer, Student, Facilities experiences | Not started |
| 8 | Authentication and shared screens (welcome, login, profile, notifications, 403/404) | Not started — existing screens inherit tokens |
| 9–10 | Motion refinement; responsive and accessibility review | Ongoing per screen |
| 11 | Competition demo (room B12 closure across roles) | Admin half done in the design lab |

Existing production screens from the backend phases already inherit the new tokens, shell and primitives. They are restyled screen by screen in the phase that owns them.

## Brand

- **Mark:** three rounded time blocks in staggered lanes on an Electric Blue tile — blocks share the week without ever overlapping. Middle block in Sky Accent. Component: `Logo`, `LogoMark`; favicon `frontend/public/favicon.svg`.
- **Wordmark:** Geist 17px / 600, −0.02em tracking. White on Midnight Navy, Primary Text on light.
- Use the tagline on welcome and authentication screens only, not in the app chrome.

## Colour tokens

Light-first. Every token has a dark counterpart under `:root[data-theme='dark']`; the theme toggle sits in the top bar and persists in `localStorage` (`clashfree-theme`).

| Group | Token | Light | Use |
| --- | --- | --- | --- |
| Brand | `--brand-midnight` | `#0B1220` | Sidebar, tooltips |
| | `--brand-deep-navy` | `#172554` | Avatar gradients |
| | `--brand-electric` / `--primary` | `#2563EB` | Primary actions, selection, focus |
| | `--brand-bright` | `#3B82F6` | Focus ring (`--ring`) |
| | `--brand-sky` | `#38BDF8` | Active nav icon, logo accent |
| Neutral | `--background` | `#F8FAFC` | App canvas |
| | `--card` | `#FFFFFF` | Surfaces |
| | `--muted` | `#F1F5F9` | Secondary surface, segmented controls |
| | `--border` / `--border-strong` | `#E2E8F0` / `#CBD5E1` | Dividers / hover borders |
| | `--foreground` | `#0F172A` | Primary text |
| | `--muted-foreground` | `#5B6B80` | Secondary text (#64748B darkened so it stays ≥ 4.5:1 on tinted surfaces) |
| | `--subtle-foreground` | `#94A3B8` | Placeholders, decorative only |
| Semantic | `--success` | `#059669` | Icons, bars |
| | `--warning` | `#D97706` | |
| | `--danger` | `#DC2626` | |
| | `--info` | `#0284C7` | |

Each semantic colour has `-subtle` (fill), `-border` and `-text` variants; `-text` is ≥ 4.5:1 on `-subtle`. `--danger-solid` stays `#DC2626` in both themes for white-label buttons. Dark-mode `--primary` is `#60A5FA` with navy labels so buttons and links keep AA contrast.

**Timetable hues** (one per department, identical in every role): Software Engineering → blue, Computer Science → sky/cyan, Information Systems → indigo, General Studies → slate, teal reserved. Each hue has `--event-{hue}-bg | -border | -text`.

Legacy `--tint-*` names remain as aliases so earlier screens adopt the palette.

## Typography

Geist Variable (`@fontsource-variable/geist`), Inter Variable fallback. `tabular-nums` for every count, time and statistic.

| Role | Size / weight | Tracking |
| --- | --- | --- |
| Page title | 26px mobile, 30px ≥ 640px / 600 | −0.025em |
| Section heading | 20px / 600 | −0.02em |
| Card heading | 15px / 600 | −0.01em |
| Body | 14–15px / 400 | — |
| Secondary | 13px / 400–500 | — |
| Caption / table header | 12px / 500 | — |
| Metric value | 28px / 600 tabular | −0.03em |
| Section label (nav groups) | 11px / 500 uppercase | +0.06em |

Never set essential information below 11px; 11px is reserved for timetable meta lines and nav group labels.

## Spacing, layout, radii, elevation

8px rhythm. Tokens: `--sidebar-width` 248px, `--sidebar-collapsed-width` 72px, `--topbar-height` 64px, `--page-padding` 16 / 24 / 32px (mobile / ≥ 640 / ≥ 1280), `--card-padding` 20px, `--content-max-width` 1536px (dense workspaces such as the timetable opt into full width).

Radii: cards 14px (`--radius`), panels and list items 10px (`--radius-sm`), controls 10px (`--radius-control`), pills only for status badges and avatars.

Elevation: `--shadow-card` (resting), `--shadow-raised` (hover), `--shadow-overlay` (menus, dialogs, toasts), `--shadow-lift` (a timetable card being dragged).

## Motion

Motion communicates state, direction, feedback or change — never decoration. `<MotionConfig reducedMotion="user">` plus a CSS reduced-motion guard disables transforms for people who ask.

| Interaction | Duration | Notes |
| --- | --- | --- |
| Button press | 100ms | scale 0.98 |
| Hover | 140ms | colour / border / shadow |
| Dropdown, select, tooltip | 180ms | fade + 4px rise |
| Modal | 220ms | fade + 6px rise + 0.98 scale |
| Page | 220ms | 6px rise + fade on route change |
| Side panel / sidebar | 260ms | spring (420 / 40) |
| Timetable event move | ≈ 360ms | spring (260 / 30); shared `layoutId` so classes glide between slots |
| Success | 320ms | check draws in |

Signature motions: nav active indicator slides between items; segmented-control thumb slides; dragged class lifts (scale 1.03, −1° tilt, lift shadow); repair comparison replays published → proposed with classes gliding to new slots; lifecycle bars fill in sequence.

## Components

| Component | File | Notes |
| --- | --- | --- |
| Button | `components/Button.tsx` | `primary`, `outline`, `subtle`, `ghost`, `danger`, `link`; sizes `sm` 32, `md` 40, `lg` 44, `icon`, `icon-sm` |
| Input, Select | `Input.tsx`, `Select.tsx` | 40px, visible label, Radix select |
| Card, CardHeader | `Card.tsx` | |
| PageHeader | `PageHeader.tsx` | eyebrow, title, description, actions |
| MetricCard | `MetricCard.tsx` | neutral surface, tone dot, optional link and emphasis |
| StatusBadge | `StatusBadge.tsx` | tinted pill with optional dot |
| SegmentedControl | `SegmentedControl.tsx` | `aria-pressed` buttons, sliding thumb |
| Stepper | `Stepper.tsx` | read-only workflow progress |
| Tooltip | `Tooltip.tsx` | Radix; tree stays stable when disabled |
| Toaster / `toast()` | `Toaster.tsx`, `lib/toast.ts` | polite live region, auto-dismiss 5.2s |
| Modal, ConfirmDialog | `Modal.tsx`, `ConfirmDialog.tsx` | focus return, Escape closes |
| CommandPalette | `CommandPalette.tsx` | ⌘K / Ctrl+K, arrow keys, Enter; also opened from the search field |
| EmptyState, Skeleton, Kbd | | |
| DataTable, FilterBar, ChartCard | | existing; adopt tokens |
| WeekGrid | `components/timetable/WeekGrid.tsx` | the interactive timetable (below) |
| Sidebar, Topbar, AppShell | | collapsible sidebar, drawer below 1024px, skip link, theme toggle, account menu |

### WeekGrid (interactive timetable)

- Time-positioned event cards; overlapping classes share a column calendar-style.
- Densities: `comfortable` (56px per hour) and `compact` (30px, dashboard / comparisons).
- Hover: rich tooltip with time, room fill, lecturer, groups, conflict reason. Click: select (opens details).
- Conflict: red outline + diagonal hatching + alert badge + accessible name text. Never colour alone.
- Draft change: blue inset outline + “Draft” badge. Moved-from ghost: dashed outline.
- Drag (mouse and touch via pointer events): card lifts, every start time is shaded valid (blue), room-change-needed (amber) or blocked (hatched); a chip under the pointer states the reason in plain language; drop opens a validation dialog. Nothing publishes from a drag.
- Keyboard / touch alternative: “Move to another time…” turns every slot into a labelled button (`aria-disabled` with the reason when blocked). Escape cancels.

## Navigation

Administrator groups: **Overview** (Dashboard) · **Scheduling** (Master Timetable, Conflict Monitor, Repair Studio, Repair Comparison, Timetable Change Review, Publish Timetable, Timetable Versions) · **Generation** (Generate Timetable, Generation Results, Scheduling Constraints, Constraint Weights) · **Academic data** (Sessions, Departments, Courses, Cohorts, Lecturers, Rooms, Assignments) · **Operations** (Disruption Centre, Reports, Users & Roles, Audit Log) · **Account**. Other roles keep their existing groups. Role permissions: `docs/permissions-matrix.md`; screen list: `docs/page-inventory.md`.

## Signature screens

| Screen | Design lab (demo data) | Production |
| --- | --- | --- |
| Administrator Dashboard | `/preview/admin/dashboard` | `/admin/dashboard` — same layout, API data |
| Master Timetable | `/preview/admin/master-timetable` | `/admin/master-timetable` — read-only WeekGrid with filters |
| Repair Studio | `/preview/admin/repair-studio` | `/admin/repair-timetable` keeps the API workflow; restyle in Phase 3 |

**Dashboard:** KPI row (courses, lecturers, rooms, scheduled classes, unresolved conflicts, active disruptions) → publication card with lifecycle (data ready → generated → validated → published) and the main actions → needs-attention queue → compact week preview → recent activity → recent disruptions.

**Master Timetable:** search, department / group / lecturer / room filters, week/day toggle, conflicts-only filter, conflict banner, details panel (inline at ≥ 1280px, sheet below), free-room suggestions, drag or pick-a-slot moves validated against every hard constraint, draft tray with discard and publish confirmation, CSV export, print.

**Repair Studio:** stepper (Disruption → Impact → Options → Compare → Approve → Publish), disruption card, affected-class list that resolves inline, repair engine with honest step reveal and real timing, option cards (recommended first, metrics, constraint count), impact strip, animated before/after/side-by-side comparison, change table, constraint validation and trade-offs, sticky decision bar that always says whether the change is **Proposed**, **Approved · draft**, or **Published**.

## Design-lab data

`frontend/src/demo/` holds one coherent dataset used by every design-lab screen, plus a deterministic constraint engine (`engine.ts`) and a session-scoped store (`store.ts`). Every verdict, option and count in the lab is computed by that engine in the browser; screens say so and never present it as the production CP-SAT solver.

- Session 2026/2027 First Semester, week of 12–16 Oct 2026; timetable v3 published.
- Departments: Software Engineering (SEN), Computer Science (CSC), Information Systems (INS), General Studies (GST).
- Rooms: A12 (120, theatre), A08 (60), B12 (90), B04 (40, seminar), Lab C05 (45), Lab C11 (50), Main Auditorium LT1 (250).
- Lecturers with real patterns: Mrs. Eze teaches Tue/Thu only, Prof. Okafor has Senate on Wednesday afternoons, Dr. Musa researches on Friday afternoons, Dr. Adeyemi examines on Thursday afternoons, Dr. Bello prefers mornings.
- Groups: SEN 400L (78), SEN 300L (85), CSC 400L A (64) / B (44), CSC 300L (96), INS 400L (48).
- 27 classes including CSC 401, SEN 403, INS 401. One deliberate clash: Room A08 double-booked Tuesday 14:00 (CSC 401 B and INS 405).
- Demonstration disruption: Room B12 closed Wednesday–Friday (ceiling leak) → 5 affected classes; the engine finds three feasible repairs (same times/new rooms — recommended; consolidate in LT1; keep B12 and move days).

## Accessibility

WCAG 2.2 AA: axe runs on every design-lab route in `e2e/preview.spec.ts`; visible focus ring on everything; skip link; dialogs trap and return focus; all icon buttons have names; conflict, draft and validation states use icon + text + pattern, not colour alone; keyboard alternatives for drag; reduced motion respected; no page-level horizontal scroll at 390, 768, 1280 or 1600px.

## Remaining work carried forward

- Restyle the production Repair Timetable / Repair Comparison pages to the Repair Studio layout using `/api/timetables/changes` for per-class diffs.
- Replace the legacy `TimetableGrid` (portals, versions) with `WeekGrid`.
- Phase 3+ screens listed in the status table.
