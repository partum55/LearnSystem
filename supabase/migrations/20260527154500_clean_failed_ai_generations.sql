-- ============================================================
-- Migration: Clean failed AI generations
-- ============================================================
DELETE FROM ai.ai_generations WHERE status = 'FAILED';
