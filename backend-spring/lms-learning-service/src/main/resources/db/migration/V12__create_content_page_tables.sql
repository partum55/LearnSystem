-- Canonical block editor storage for module pages and assignment/submission documents.

CREATE TABLE IF NOT EXISTS module_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    parent_page_id UUID REFERENCES module_pages(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    has_unpublished_changes BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_module_page_slug UNIQUE (module_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_module_pages_module_parent_position
    ON module_pages(module_id, parent_page_id, position);
CREATE INDEX IF NOT EXISTS idx_module_pages_module_published
    ON module_pages(module_id, is_published);

CREATE TABLE IF NOT EXISTS page_documents (
    page_id UUID PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    doc_hash VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_published_documents (
    page_id UUID PRIMARY KEY REFERENCES module_pages(id) ON DELETE CASCADE,
    doc_json JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    doc_hash VARCHAR(64) NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS assignment_template_documents (
    assignment_id UUID PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
    doc_json JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS submission_documents (
    submission_id UUID PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
    doc_json JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE module_pages IS 'Hierarchical page tree scoped to a module for block-editor content.';
COMMENT ON TABLE page_documents IS 'Draft canonical document JSON for module pages.';
COMMENT ON TABLE page_published_documents IS 'Published canonical document snapshots for student-visible pages.';
COMMENT ON TABLE assignment_template_documents IS 'Instructor-defined starter documents for assignments.';
COMMENT ON TABLE submission_documents IS 'Canonical document storage for student submission editor.';
