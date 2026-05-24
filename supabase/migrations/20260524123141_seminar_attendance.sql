-- Create enums in the learning schema
CREATE TYPE learning.seminar_attendance_session_status AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED');
CREATE TYPE learning.seminar_attendance_record_status AS ENUM ('PRESENT');
CREATE TYPE learning.seminar_attendance_record_method AS ENUM ('QR');

-- Create sessions table
CREATE TABLE learning.seminar_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES learning.assignments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    token_hash VARCHAR(255) NOT NULL,
    status learning.seminar_attendance_session_status NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create records table
CREATE TABLE learning.seminar_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES learning.seminar_attendance_sessions(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES learning.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id),
    status learning.seminar_attendance_record_status NOT NULL DEFAULT 'PRESENT',
    method learning.seminar_attendance_record_method NOT NULL DEFAULT 'QR',
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE learning.seminar_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning.seminar_attendance_records ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON learning.seminar_attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning.seminar_attendance_records TO authenticated;

-- RLS Policies for seminar_attendance_sessions
CREATE POLICY "seminar_attendance_sessions_select"
  ON learning.seminar_attendance_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      JOIN learning.assignments a ON a.id = learning.seminar_attendance_sessions.assignment_id
      WHERE cm.course_id = a.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
    )
  );

CREATE POLICY "seminar_attendance_sessions_all_teachers"
  ON learning.seminar_attendance_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning.course_members cm
      JOIN learning.assignments a ON a.id = learning.seminar_attendance_sessions.assignment_id
      WHERE cm.course_id = a.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
        AND cm.role_in_course IN ('OWNER'::learning.course_role, 'TEACHER'::learning.course_role, 'TA'::learning.course_role)
    )
  );

-- RLS Policies for seminar_attendance_records
CREATE POLICY "seminar_attendance_records_select"
  ON learning.seminar_attendance_records FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM learning.course_members cm
      JOIN learning.assignments a ON a.id = learning.seminar_attendance_records.assignment_id
      WHERE cm.course_id = a.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
        AND cm.role_in_course IN ('OWNER'::learning.course_role, 'TEACHER'::learning.course_role, 'TA'::learning.course_role)
    )
  );

CREATE POLICY "seminar_attendance_records_insert"
  ON learning.seminar_attendance_records FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM learning.course_members cm
      JOIN learning.assignments a ON a.id = learning.seminar_attendance_records.assignment_id
      WHERE cm.course_id = a.course_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'::learning.course_member_status
    )
  );
