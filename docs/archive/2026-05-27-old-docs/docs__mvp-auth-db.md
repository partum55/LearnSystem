# MVP Auth/DB Canonical Model

This is the MVP rule: LearnSystem has one app user table, `public.users`. Supabase still owns the managed `auth` schema.

## What Stays

`auth.users` stays as the identity root. Supabase Auth uses it for signup, login, email confirmation, password recovery, provider identities, sessions, refresh tokens, MFA, and JWT issuance.

`public.users` stays as the app profile table. It stores only product data:

- `id`: same UUID as `auth.users.id`
- `email`: denormalized from Supabase Auth for search/admin screens
- `display_name`, `first_name`, `last_name`, `avatar_url`, `bio`
- `role`: global app role, only `ADMIN`, `TEACHER`, `USER`
- `locale`, `theme`, `preferences`
- `is_active`, `is_deleted`, `email_verified`

`learning.course_members` stays as the course-role table. Course permissions are not global auth roles:

- global role: `public.users.role`
- course role: `learning.course_members.role_in_course`

## What Does Not Stay

There should be no custom `auth.*` application tables. If a table is in `auth`, assume Supabase owns it.

Do not add another `profiles`, `user_profiles`, `accounts`, `sessions`, `roles`, or `permissions` table for MVP. That creates two sources of truth. Put app profile fields in `public.users`, and put course permissions in `learning.course_members`.

## Why Not Use Only `auth.users`

Supabase keeps the Auth schema private from the generated API. Their documented pattern is to create an app-owned table in `public`, enable RLS, reference `auth.users(id)`, and sync it with a trigger.

`auth.users.raw_user_meta_data` is also user-controlled metadata, so it must not be used for authorization. Global roles belong in `public.users.role`; the DB mirrors that role into `auth.users.raw_app_meta_data.role` only so refreshed JWTs carry the current app role for backend filters.

## Current Canonical Flow

1. Signup/admin creation creates `auth.users`.
2. `private.sync_auth_user_profile()` inserts or updates `public.users`.
3. Admin role changes update `public.users.role`.
4. `private.sync_auth_role_claim_from_profile()` mirrors the role into `auth.users.raw_app_meta_data.role`.
5. Backend services authorize with:
   - JWT identity from Supabase
   - global role from JWT app metadata or `public.users`
   - course role from `learning.course_members`

## Deletion Rule

Deleting a user must delete the Supabase Auth identity first. `public.users` has `ON DELETE CASCADE`, so the profile cannot outlive the identity.

For MVP, never delete rows directly from `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, or similar Supabase-managed tables.
