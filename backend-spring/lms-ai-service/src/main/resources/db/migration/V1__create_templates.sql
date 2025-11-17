-- Create AI course templates table
CREATE TABLE IF NOT EXISTS ai_course_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    category VARCHAR(50) NOT NULL,
    prompt_template TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    usage_count INTEGER NOT NULL DEFAULT 0,
    average_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create template variables table
CREATE TABLE IF NOT EXISTS template_variables (
    template_id UUID NOT NULL,
    variable_name VARCHAR(100) NOT NULL,
    default_value TEXT,
    PRIMARY KEY (template_id, variable_name),
    FOREIGN KEY (template_id) REFERENCES ai_course_templates(id) ON DELETE CASCADE
);

-- Create template options table
CREATE TABLE IF NOT EXISTS template_options (
    template_id UUID NOT NULL,
    option_key VARCHAR(100) NOT NULL,
    option_value TEXT,
    PRIMARY KEY (template_id, option_key),
    FOREIGN KEY (template_id) REFERENCES ai_course_templates(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_templates_category ON ai_course_templates(category);
CREATE INDEX idx_templates_public_active ON ai_course_templates(is_public, is_active);
CREATE INDEX idx_templates_usage ON ai_course_templates(usage_count DESC);
CREATE INDEX idx_templates_rating ON ai_course_templates(average_rating DESC);

-- Add comments
COMMENT ON TABLE ai_course_templates IS 'AI course generation templates';
COMMENT ON TABLE template_variables IS 'Variables for course templates';
COMMENT ON TABLE template_options IS 'Default options for templates';

