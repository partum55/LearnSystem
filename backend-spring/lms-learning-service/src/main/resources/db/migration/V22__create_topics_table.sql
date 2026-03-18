-- Topics: optional organizational layer inside modules
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_topics_module_position ON topics(module_id, position);

ALTER TABLE assignments ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;
CREATE INDEX idx_assignments_topic ON assignments(topic_id);

ALTER TABLE resources ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;
CREATE INDEX idx_resources_topic ON resources(topic_id);
