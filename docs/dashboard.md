# Dashboard

## Implemented Now

LearnSystem has role-based dashboards:

- Student dashboard.
- Teacher dashboard.
- Admin dashboard.

Implementation lives under `apps/web/src/features/dashboard`.

## Grid Model

Implemented now:

- 4-column invisible grid.
- Drag reorder.
- Predefined widget sizes only:
  - `1x1`
  - `2x1`
  - `1x2`
  - `2x2`
  - `4x1`
  - `4x2`
- Browser `localStorage` persistence.
- Widget registry.
- Per-role default layouts.

## Data Rules

Widgets should use real API data or show an honest TODO/empty state. Do not populate dashboards with fake production-looking data.

Implemented widget areas include student, teacher, and admin dashboard components. Some widgets may still need production verification for complete data coverage.

## Planned

- Server-side persistence through a future `user_dashboard_layouts` table with `layout_json`.
- Notification preferences.
- Analytics-backed widgets after analytics flows are verified.
