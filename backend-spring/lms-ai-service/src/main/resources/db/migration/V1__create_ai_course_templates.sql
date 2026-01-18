-- V1: Create AI course templates and related tables
-- This is the base migration for AI service entities

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ai_course_templates table
CREATE TABLE IF NOT EXISTS ai_course_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    category VARCHAR(100) NOT NULL,
    prompt_template TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    usage_count INTEGER NOT NULL DEFAULT 0,
    average_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create template_variables collection table
CREATE TABLE IF NOT EXISTS template_variables (
    template_id UUID NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    variable_name VARCHAR(255) NOT NULL,
    default_value VARCHAR(255),
    PRIMARY KEY (template_id, variable_name)
);

-- Create template_options collection table
CREATE TABLE IF NOT EXISTS template_options (
    template_id UUID NOT NULL REFERENCES ai_course_templates(id) ON DELETE CASCADE,
    option_key VARCHAR(255) NOT NULL,
    option_value VARCHAR(255),
    PRIMARY KEY (template_id, option_key)
);

-- Create indexes for better performance
CREATE INDEX idx_ai_course_templates_category ON ai_course_templates(category);
CREATE INDEX idx_ai_course_templates_active ON ai_course_templates(is_active);
CREATE INDEX idx_ai_course_templates_public ON ai_course_templates(is_public);

