# ClashFree Design Specification

Visual source of truth: `docs/design-references/02_Timetable_Admin/dashboard.png` (1600 × 1000). Role pages in the archive are 1600 × 1000 except authentication (variable) and student screens (1586 × 992). Implement tokens as CSS variables in `frontend/src/index.css`. Do not repeat arbitrary hex or spacing values inside components.

## Colour tokens

Sampled from the administrator dashboard PNG and rounded to stable tokens.

| Token | Hex | Use |
| --- | --- | --- |
| `--sidebar` | `#0D223B` | Desktop sidebar background |
| `--sidebar-accent` | `#0E2642` | Sidebar hover / secondary navy |
| `--sidebar-foreground` | `#D7E3F2` | Inactive nav labels |
| `--sidebar-muted` | `#8AA0B8` | Section labels (`MAIN`, `ACCOUNT`) |
| `--primary` | `#126BD3` | Primary actions, selected nav, links |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--background` | `#F5F8FC` | App canvas |
| `--foreground` | `#0F172A` | Headings and primary text |
| `--muted-foreground` | `#5C6B80` | Supporting copy |
| `--card` | `#FFFFFF` | Cards, topbar, tables |
| `--border` | `#E2E8F0` | Card and table borders |
| `--ring` | `#1575E5` | Focus rings |
| `--success` | `#0F9F6E` | Active / published / online |
| `--warning` | `#B45309` | In review / attention |
| `--danger` | `#E11D48` | Open disruptions / conflicts |
| `--info` | `#2563EB` | Scheduled / informational badges |

Metric tile tints (use CSS variables, not one-off classes):

| Token | Hex | Dashboard card |
| --- | --- | --- |
| `--tint-blue` | `#F2F8FF` | Total courses |
| `--tint-green` | `#F1FBF6` | Lecturers |
| `--tint-purple` | `#F5F1FF` | Student cohorts |
| `--tint-lavender` | `#F8F6FF` | Rooms |
| `--tint-amber` | `#FFF8EE` | Unresolved conflicts |
| `--tint-rose` | `#FFF4F5` | Active disruptions |

Chart series: `--chart-1` `#3B82F6`, `--chart-2` `#60A5FA`, `--chart-3` `#93C5FD`. Workload: optimal `#0F9F6E`, underutilized `#1575E5`, overloaded `#E11D48`.

Light theme only.

## Typography

Bundled font: **Inter** (`@fontsource-variable/inter`) with fallback `ui-sans-serif, system-ui, sans-serif`.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Page title | 1.5rem (24px) | 700 | 1.25 |
| Section / card heading | 0.95rem (15px) | 600 | 1.4 |
| Metric value | 1.75rem (28px) | 700 | 1.1 |
| Body | 0.875rem (14px) | 400 | 1.5 |
| Label / table header | 0.75rem (12px) | 500 | 1.4 |
| Sidebar item | 0.8125rem (13px) | 500 | 1.3 |
| Sidebar section | 0.6875rem (11px) | 600 | 1.2 |
| Brand wordmark | 1.125rem (18px) | 700 | 1.2 |

## Spacing, radii, shadows, navigation

| Token | Value |
| --- | --- |
| `--sidebar-width` | 16.5rem (264px) |
| `--topbar-height` | 4rem (64px) |
| `--page-padding` | 1.5rem |
| `--card-padding` | 1.25rem |
| `--radius` | 0.9rem |
| `--radius-sm` | 0.55rem |
| `--radius-pill` | 999px |
| `--shadow-card` | `0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px rgb(15 23 42 / 0.04)` |
| Table row height | 2.75rem |
| Control height | 2.5rem (40px) minimum touch target |
| Focus ring | 2px solid `var(--ring)` with 2px offset |

Sidebar: navy column, logo + tagline, online user chip, grouped nav, independently scrollable nav list. Selected item is a primary-blue pill with white label.

Topbar: white bar, search field, academic-session chip, notification bell, identity block.

## Component states

- **Button primary:** `--primary` fill, white label; disabled at 50% opacity, `not-allowed`, no click side effects.
- **Button outline:** white fill, `--border` stroke, `--foreground` label.
- **Input / select:** white fill, 1px border, 40px height, visible label associated with the control.
- **Status badges:** tinted pill + readable text (`Open`, `In review`, `Scheduled`, `Published`, `Active`).
- **Cards:** white, 1px border, light shadow, `--radius`.
- **Focus:** never remove outlines; use `--ring`.
- **Disabled solver actions:** remain visible, `aria-disabled`, helper text that generation, repair and publishing are unavailable in this preview.

## Responsive behaviour

| Viewport | Layout |
| --- | --- |
| ≥ 1024px | Fixed sidebar, content offset by `--sidebar-width`. |
| < 1024px | Sidebar becomes an overlay drawer. Open via menu control; dismiss via overlay, Escape, or close. |
| Tablet / mobile | Metric cards wrap (2 then 1 column). Chart / workload / actions stack. Tables scroll horizontally inside the card; the page itself must not overflow. |

## Iconography

Use `lucide-react` SVG icons at 16–20px in navigation and 16px in table/status contexts. Do not introduce a second icon set.

## Intentional deviations from mockups

Recorded in `docs/visual-review.md` when screenshots are reviewed. Known in advance:

1. Sidebar Settings and Help & Support are reachable via independent sidebar scroll (the 1600 × 1000 mockup clips the account group).
2. A persistent “Design preview · sample data” banner is required so fixtures cannot be mistaken for live solver output.
3. Generate / Repair / Publish controls are disabled in Phase 0 rather than appearing to run.
4. Authentication and student source images keep original dimensions; implementation still uses the same tokens and does not distort those PNGs.
5. Unreadable or clipped mockup labels may be completed with accessible text while preserving structure.
