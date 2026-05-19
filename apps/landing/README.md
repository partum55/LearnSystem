# LearnSystem Landing

Public marketing site for `learnsystem.app`.

This app is intentionally separate from `apps/web` and builds to static assets with Vite. On Vercel, set the project root to `apps/landing`. Vercel's Vite preset uses `npm run build` and the `dist` output directory.

Set `VITE_APP_URL` to point CTA links at the LMS app, for example `https://app.learnsystem.app`.
