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
