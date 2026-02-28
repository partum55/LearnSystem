-- Storage metadata for canonical editor media uploads (image/pdf).

CREATE TABLE IF NOT EXISTS editor_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1200) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_editor_media_uploaded_by_created_at
    ON editor_media(uploaded_by, created_at DESC);

COMMENT ON TABLE editor_media IS 'Metadata for uploaded editor assets (images and PDFs).';
