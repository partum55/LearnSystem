-- seed.sql
-- Minimal demo data. No real credentials. Supabase Auth public.users must be
-- created manually in the Supabase Dashboard before these profiles work
-- with auth.uid() RLS policies.
--
-- Manual step: Create demo public.users in Supabase Dashboard > Authentication
-- with emails matching the UUIDs below, then update these UUIDs.
--
-- For local dev with `supabase start`, use the seed API instead:
--   supabase functions serve seed  (if a seed function is added)

-- Demo roles are embedded in the public.users.role column (no separate roles table needed).

-- Insert sample prompt templates only (safe, no user data)
INSERT INTO ai.prompt_templates (name, description, system_prompt, user_prompt_template, category, temperature, max_tokens)
VALUES (
    'syllabus.generation.default',
    'Generate a course syllabus from title and objectives',
    'You are a curriculum designer. Generate clear, professional course syllabi.',
    'Generate a syllabus for: {{courseTitle}}
Objectives: {{objectives}}
Duration: {{duration}} weeks',
    'course', 0.5, 3000
)
ON CONFLICT (name) DO NOTHING;
