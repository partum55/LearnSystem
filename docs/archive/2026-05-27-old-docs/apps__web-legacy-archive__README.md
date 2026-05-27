# LearnSystem Web Legacy Archive

This directory contains the old frontend source that was separated from `apps/web`.

- It is reference-only.
- It is not part of the active Next.js build, typecheck, or lint target.
- Do not import from this directory into `apps/web`.
- Canonicalized code should be rebuilt inside `apps/web` using the learning-service `/api/v1` contract.

The active app is now expected to keep only canonical API clients, React Query hooks, shared layout, authentication/session plumbing, and placeholder-ready screens while legacy features are migrated one at a time.
