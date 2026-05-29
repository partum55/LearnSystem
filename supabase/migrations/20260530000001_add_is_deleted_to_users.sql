-- Re-add is_deleted to public.users for soft-delete support.
-- Soft-delete prevents FK violations on courses.owner_id when deactivating users.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON public.users(is_deleted);

COMMIT;
