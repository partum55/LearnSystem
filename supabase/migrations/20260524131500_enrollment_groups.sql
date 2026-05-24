-- ============================================================
-- ENROLLMENT GROUPS SCHEMA MIGRATION
-- ============================================================

-- 1. Create global enrollment groups table
CREATE TABLE learning.enrollment_groups (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL UNIQUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create enrollment group members table
CREATE TABLE learning.enrollment_group_members (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id          UUID        NOT NULL REFERENCES learning.enrollment_groups(id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enrollment_group_user UNIQUE (group_id, user_id)
);

-- 3. Create course groups link table
CREATE TABLE learning.course_groups (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id         UUID        NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    group_id          UUID        NOT NULL REFERENCES learning.enrollment_groups(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_group UNIQUE (course_id, group_id)
);

-- Indexes for performance
CREATE INDEX idx_enrollment_group_members_group ON learning.enrollment_group_members(group_id);
CREATE INDEX idx_enrollment_group_members_user  ON learning.enrollment_group_members(user_id);
CREATE INDEX idx_course_groups_course          ON learning.course_groups(course_id);
CREATE INDEX idx_course_groups_group           ON learning.course_groups(group_id);

-- Enable Row Level Security (RLS)
ALTER TABLE learning.enrollment_groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.enrollment_group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.course_groups                   ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT ON learning.enrollment_groups TO authenticated;
GRANT SELECT ON learning.enrollment_group_members TO authenticated;
GRANT SELECT ON learning.course_groups TO authenticated;

-- Policies for Authenticated Read
CREATE POLICY "allow_authenticated_select_groups" ON learning.enrollment_groups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_authenticated_select_group_members" ON learning.enrollment_group_members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_authenticated_select_course_groups" ON learning.course_groups
    FOR SELECT TO authenticated USING (true);
