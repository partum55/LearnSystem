# Frontend (React + TypeScript + Vite)

## Prerequisites

- Node.js 22+
- npm 10+

## Environment

Copy the frontend template and adjust values if needed:

```bash
cp .env.example .env
```

Important variables:

- `VITE_API_URL` (default `/api`)
- `VITE_AI_SERVICE_URL` (default `/api/ai`)
- `VITE_API_TARGET` (dev proxy target, default `http://localhost:8080`)

## Commands

```bash
# Start dev server
npm run dev

# Build production assets
npm run build

# Run linter
npm run lint

# Run route contract checks
npm run test:contracts
```

## Notes

- The app uses route-level code splitting via `React.lazy`.
- API access is centralized under `src/api/*`.
- React Query hooks live in `src/queries/*` and `src/mutations/*`.
