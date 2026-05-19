# Frontend (Next.js + React + TypeScript)

## Prerequisites

- Node.js 22+
- npm 10+
- Access to a remote Supabase project

## Environment

Copy the frontend template and adjust values if needed:

```bash
cp .env.example .env.local
```

Important variables:

- `NEXT_PUBLIC_SUPABASE_URL` (`https://your-project-ref.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `NEXT_PUBLIC_API_URL` (optional compatibility endpoint, default `/api`)
- `NEXT_PUBLIC_AI_SERVICE_URL` (optional compatibility endpoint, default `/api/ai`)

## Remote Supabase

From the repository root:

```bash
./frontend/node_modules/.bin/supabase login
./frontend/node_modules/.bin/supabase link --project-ref your-project-ref
./frontend/node_modules/.bin/supabase db push
```

Do not use local Supabase credentials in `.env.local`. Schema, RLS, and storage bucket changes belong in `../supabase/migrations`.

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

- The app uses the Next.js App Router in `src/app`.
- Preserved Vite-era page components live in `src/legacy-pages` and are routed by `src/app-router`.
- Supabase clients live in `src/lib/supabase`; domain operations live in `src/services`.
- React Query hooks live in `src/queries/*` and `src/mutations/*`.
