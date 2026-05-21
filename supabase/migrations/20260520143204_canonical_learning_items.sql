-- Canonical LMS learning-content model.
--
-- The legacy learning.resources, learning.lessons, and learning.lesson_content_blocks
-- tables remain for older unversioned code paths, but /api/v1 learning content now
-- reads and writes learning.learning_items and learning.lesson_blocks directly.

CREATE TABLE IF NOT EXISTS learning.learning_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID        NOT NULL REFERENCES learning.modules(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL CHECK (type IN ('PDF','LINK','VIDEO','FILE','RTE','LESSON')),
    title       TEXT        NOT NULL,
    description TEXT,
    position    INTEGER     NOT NULL DEFAULT 0,
    status      TEXT        NOT NULL DEFAULT 'HIDDEN'
                            CHECK (status IN ('VISIBLE','HIDDEN','ARCHIVED')),
    content     JSONB       NOT NULL DEFAULT '{}',
    settings    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_items_module_position
    ON learning.learning_items(module_id, position);
CREATE INDEX IF NOT EXISTS idx_learning_items_type
    ON learning.learning_items(type);
CREATE INDEX IF NOT EXISTS idx_learning_items_status
    ON learning.learning_items(status);

DROP TRIGGER IF EXISTS trg_learning_items_updated_at ON learning.learning_items;
CREATE TRIGGER trg_learning_items_updated_at
    BEFORE UPDATE ON learning.learning_items
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS learning.lesson_blocks (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_item_id UUID        NOT NULL REFERENCES learning.learning_items(id) ON DELETE CASCADE,
    type             TEXT        NOT NULL CHECK (type IN ('TEXT','VIDEO','INLINE_QUIZ_QUESTION')),
    title            TEXT,
    content          TEXT,
    content_format   TEXT        NOT NULL DEFAULT 'RICH'
                                 CHECK (content_format IN ('PLAIN','MARKDOWN','HTML','RICH')),
    position         INTEGER     NOT NULL DEFAULT 0,
    settings         JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_blocks_item_position
    ON learning.lesson_blocks(learning_item_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_type
    ON learning.lesson_blocks(type);

DROP TRIGGER IF EXISTS trg_lesson_blocks_updated_at ON learning.lesson_blocks;
CREATE TRIGGER trg_lesson_blocks_updated_at
    BEFORE UPDATE ON learning.lesson_blocks
    FOR EACH ROW EXECUTE FUNCTION private.trigger_set_updated_at();

INSERT INTO learning.learning_items (
    id,
    module_id,
    type,
    title,
    description,
    position,
    status,
    content,
    settings,
    created_at,
    updated_at
)
SELECT
    r.id,
    r.module_id,
    CASE r.resource_type
        WHEN 'PDF' THEN 'PDF'
        WHEN 'SLIDE' THEN 'PDF'
        WHEN 'LINK' THEN 'LINK'
        WHEN 'VIDEO' THEN 'VIDEO'
        WHEN 'TEXT' THEN 'RTE'
        WHEN 'CODE' THEN 'RTE'
        ELSE 'FILE'
    END,
    r.title,
    r.description,
    r.position,
    'VISIBLE',
    jsonb_strip_nulls(jsonb_build_object(
        'url', COALESCE(r.file_url, r.external_url),
        'textContent', r.text_content,
        'fileSize', r.file_size,
        'mimeType', r.mime_type,
        'downloadable', r.is_downloadable
    )),
    COALESCE(r.metadata, '{}'::jsonb),
    r.created_at,
    r.updated_at
FROM learning.resources r
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.learning_items (
    id,
    module_id,
    type,
    title,
    description,
    position,
    status,
    content,
    settings,
    created_at,
    updated_at
)
SELECT
    l.id,
    l.module_id,
    'LESSON',
    l.title,
    l.summary,
    l.position,
    CASE WHEN l.is_published THEN 'VISIBLE' ELSE 'HIDDEN' END,
    '{}'::jsonb,
    COALESCE(l.content_meta, '{}'::jsonb),
    l.created_at,
    l.updated_at
FROM learning.lessons l
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.lesson_blocks (
    id,
    learning_item_id,
    type,
    title,
    content,
    content_format,
    position,
    settings,
    created_at,
    updated_at
)
SELECT
    b.id,
    b.lesson_id,
    CASE b.block_type
        WHEN 'QUIZ' THEN 'INLINE_QUIZ_QUESTION'
        ELSE 'TEXT'
    END,
    b.title,
    b.content,
    b.content_format,
    b.position,
    jsonb_strip_nulls(jsonb_build_object(
        'questions', b.questions,
        'metadata', b.metadata,
        'legacyBlockType', b.block_type
    )),
    b.created_at,
    b.updated_at
FROM learning.lesson_content_blocks b
JOIN learning.learning_items i ON i.id = b.lesson_id AND i.type = 'LESSON'
ON CONFLICT (id) DO NOTHING;
