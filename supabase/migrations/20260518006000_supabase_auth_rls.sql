BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    display_name,
    first_name,
    last_name,
    role,
    locale,
    theme,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    'UK',
    'light',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.users.display_name, EXCLUDED.display_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can manage own API keys"
  ON public.user_api_keys FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Published courses are readable"
  ON public.courses FOR SELECT
  USING (is_published = true OR owner_id = auth.uid());

CREATE POLICY "Course owners can manage courses"
  ON public.courses FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can read their course membership"
  ON public.course_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Course owners can manage memberships"
  ON public.course_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_members.course_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_members.course_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can read course modules"
  ON public.modules FOR SELECT
  USING (
    is_published = true OR EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Course staff can manage modules"
  ON public.modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = modules.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  );

CREATE POLICY "Members can read module resources"
  ON public.resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = resources.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Members can read lessons"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE m.id = lessons.module_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Members can read lesson blocks"
  ON public.lesson_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.course_members cm ON cm.course_id = m.course_id
      WHERE l.id = lesson_content_blocks.lesson_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Members can read assignments"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = assignments.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Members can read quizzes"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = quizzes.course_id
        AND cm.user_id = auth.uid()
        AND cm.enrollment_status = 'active'
    )
  );

CREATE POLICY "Course staff can manage question bank"
  ON public.question_bank FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = question_bank.course_id
        AND cm.user_id = auth.uid()
        AND cm.role_in_course IN ('TEACHER', 'TA')
    )
  );

CREATE POLICY "Users can manage own submissions"
  ON public.submissions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
