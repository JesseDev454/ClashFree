# Phase 0 visual review

Baselines are Playwright screenshots in `frontend/e2e/preview.spec.ts-snapshots/`. They were generated from the production Vite preview after fonts had loaded and animations were disabled. Automated baseline creation is not treated as proof of fidelity; this file records the comparison against `docs/design-references/02_Timetable_Admin/dashboard.png`.

## Desktop 1600 × 1000

Compared to `02_Timetable_Admin/dashboard.png`.

Matches:

- Navy sidebar, white topbar, pale canvas, primary blue actions and bordered cards.
- Welcome heading, six metric tiles, classes-per-day chart, lecturer workload, quick actions, recent disruptions and timetable status.
- Sample values (327 courses, 94 lecturers, 28 cohorts, 38 rooms, 4 conflicts, 2 disruptions).

Intentional deviations:

1. Persistent “Design preview · sample data” banner so fixtures cannot be mistaken for solver output. The banner also reports backend health (`API connected` / `API unreachable`) after the Phase 1 health endpoint.
2. Independently scrolling sidebar so Settings and Help & Support remain reachable (the mockup clips the account group).
3. Generate / Repair / Publish controls are visibly disabled with helper text. They do not appear to succeed.
4. Component gallery link in the banner (preview-only).
5. Inter is bundled; iconography is Lucide rather than the mixed mockup icons.
6. Chart bar heights are deterministic fixtures, not a pixel-traced copy of the illustration.
7. Focus rings and 40px control heights are stronger than the mockup where needed for accessibility.
8. Status badge text is a darker shade than the raw success/warning tokens so 12px labels meet contrast on tinted backgrounds.

The preview routes run axe with the full WCAG 2 AA color-contrast rule enabled. Primary, muted and warning tokens were adjusted so the current dashboard and component gallery meet the automated contrast check. Future role pages must keep the same token contrast requirement during their Phase 11 polish pass.

## 768px and 390px

There are no official mobile mockups. The desktop structure is preserved with:

- Overlay drawer navigation below 1024px, dismissed with overlay, close semantics and Escape.
- Wrapping metric cards.
- Independently scrolling tables.
- No page-wide horizontal overflow.

## Keyboard

- Tab order reaches search, session/identity controls, primary content and disabled solver actions.
- Gallery modal: focus enters the dialog, Escape closes it, focus returns to the trigger.
- Mobile drawer: Escape dismisses navigation.

## Precision Motion redesign (design phases 1–2)

The admin mockup PNGs are superseded by `docs/design-specification.md`. Baselines in `frontend/e2e/preview.spec.ts-snapshots/` were regenerated on Linux Chromium with `locale: en-GB` and `timezoneId: Africa/Lagos` pinned in `playwright.config.ts`, and now include `master-timetable-1440.png` and `repair-studio-empty-1440.png`.

- Axe (serious/critical) is clean on the dashboard, master timetable, repair studio and gallery.
- `--muted-foreground` is `#5B6B80` rather than the brief's `#64748B`, which measured 4.34–4.46:1 on tinted surfaces.
- No page-level horizontal overflow at 1600, 1280, 768 or 390px on the three signature routes; the week grid scrolls inside its card, and phones default to the day view.
