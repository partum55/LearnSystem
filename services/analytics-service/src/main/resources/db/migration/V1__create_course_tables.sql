-- V1__create_course_tables.sql
-- Initial schema for course management service

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title_uk VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description_uk TEXT,
    description_en TEXT,
    syllabus TEXT,
    owner_id UUID NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    thumbnail_url VARCHAR(500),
    start_date DATE,
    end_date DATE,
    academic_year VARCHAR(20),
    department_id UUID,
    max_students INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for courses
CREATE INDEX idx_course_code ON courses(code);
CREATE INDEX idx_course_owner ON courses(owner_id);
CREATE INDEX idx_course_published ON courses(is_published);
CREATE INDEX idx_course_status ON courses(status);
CREATE INDEX idx_course_academic_year ON courses(academic_year);
CREATE INDEX idx_course_department ON courses(department_id);

-- Create course_members table
CREATE TABLE IF NOT EXISTS course_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role_in_course VARCHAR(20) NOT NULL,
    added_by UUID,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enrollment_status VARCHAR(20) NOT NULL DEFAULT 'active',
    completion_date TIMESTAMP,
    final_grade DECIMAL(5, 2),
    CONSTRAINT uk_course_user UNIQUE (course_id, user_id)
);

-- Create indexes for course_members
CREATE INDEX idx_member_course_user ON course_members(course_id, user_id);
CREATE INDEX idx_member_role ON course_members(role_in_course);
CREATE INDEX idx_member_status ON course_members(enrollment_status);
CREATE INDEX idx_member_user ON course_members(user_id);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    content_meta JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    publish_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for modules
CREATE INDEX idx_module_course_position ON modules(course_id, position);
CREATE INDEX idx_module_published ON modules(is_published);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(20) NOT NULL,
    file_url VARCHAR(500),
    external_url VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    position INTEGER NOT NULL DEFAULT 0,
    is_downloadable BOOLEAN NOT NULL DEFAULT TRUE,
    text_content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for resources
CREATE INDEX idx_resource_module ON resources(module_id);
CREATE INDEX idx_resource_type ON resources(resource_type);
CREATE INDEX idx_resource_position ON resources(module_id, position);

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Main courses table with multilingual support';
COMMENT ON TABLE course_members IS 'Course membership and enrollment tracking';
COMMENT ON TABLE modules IS 'Course modules for content organization';
COMMENT ON TABLE resources IS 'Course resources (files, links, content)';

COMMENT ON COLUMN courses.visibility IS 'PUBLIC, PRIVATE, or DRAFT';
COMMENT ON COLUMN courses.status IS 'DRAFT, PUBLISHED, or ARCHIVED';
COMMENT ON COLUMN course_members.role_in_course IS 'TEACHER, TA, or STUDENT';
COMMENT ON COLUMN course_members.enrollment_status IS 'active, dropped, or completed';
COMMENT ON COLUMN resources.resource_type IS 'VIDEO, PDF, SLIDE, LINK, TEXT, CODE, or OTHER';

