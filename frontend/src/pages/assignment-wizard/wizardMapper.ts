import { WizardFormData, initialWizardFormData } from './wizardTypes';
import {
  AssignmentFormData,
  AssignmentRequestPayload,
  mapAssignmentResponseToFormData,
} from '../assignment-editor/assignmentEditorModel';

/**
 * Convert backend API response to wizard form data.
 */
export function apiResponseToWizardData(raw: Record<string, unknown>): WizardFormData {
  const legacy = mapAssignmentResponseToFormData(raw);
  return legacyToWizardData(legacy);
}

/**
 * Convert legacy AssignmentFormData to wizard state.
 */
export function legacyToWizardData(legacy: AssignmentFormData): WizardFormData {
  return {
    ...initialWizardFormData,
    assignment_type: legacy.assignment_type as WizardFormData['assignment_type'],
    title: legacy.title,
    description: legacy.description,
    description_format: legacy.description_format,
    instructions: legacy.instructions,
    instructions_format: legacy.instructions_format,
    programming_language: legacy.programming_language,
    starter_code: legacy.starter_code,
    solution_code: legacy.solution_code,
    resources: legacy.resources.map(r => ({ ...r, type: r.type || 'document' })),
    embeds: [],
    due_date: legacy.due_date,
    available_from: legacy.available_from,
    available_until: legacy.available_until,
    allowed_file_types: legacy.allowed_file_types,
    max_files: legacy.max_files,
    max_file_size: legacy.max_file_size,
    allow_late_submission: legacy.allow_late_submission,
    late_penalty_percent: legacy.late_penalty_percent,
    estimated_duration: legacy.estimated_duration,
    tags: legacy.tags,
    prerequisites: legacy.prerequisites,
    max_points: legacy.max_points,
    rubric: legacy.rubric,
    rubric_draft: {
      criteria: [{
        id: `criterion-${Date.now()}`,
        title: 'New Criterion',
        description: '',
        weight: 0,
        explanation: '',
        format: 'MARKDOWN',
      }],
      totalPoints: legacy.max_points,
    },
    auto_grading_enabled: legacy.auto_grading_enabled,
    test_cases: legacy.test_cases,
    quiz_questions: [],
    is_published: false,
    is_template: legacy.is_template,
    ai_drafts: [],
  };
}

/**
 * Convert wizard state to backend API payload.
 */
export function wizardDataToApiPayload(
  data: WizardFormData,
  courseId: string,
  moduleId?: string,
): AssignmentRequestPayload {
  return {
    courseId: courseId || undefined,
    moduleId: moduleId || undefined,
    assignmentType: data.assignment_type,
    title: data.title,
    description: data.description,
    descriptionFormat: data.description_format,
    instructions: data.instructions,
    instructionsFormat: data.instructions_format,
    maxPoints: data.max_points,
    dueDate: data.due_date || null,
    availableFrom: data.available_from || null,
    availableUntil: data.available_until || null,
    starterCode: data.starter_code || null,
    programmingLanguage: data.programming_language || null,
    resources: data.resources.map(r => ({ name: r.name, url: r.url, type: r.type })),
    allowedFileTypes: data.allowed_file_types,
    maxFiles: data.max_files,
    maxFileSize: data.max_file_size,
    testCases: data.test_cases,
    autoGradingEnabled: data.auto_grading_enabled,
    rubric: data.rubric,
    allowLateSubmission: data.allow_late_submission,
    latePenaltyPercent: data.late_penalty_percent,
    tags: data.tags,
    estimatedDuration: data.estimated_duration,
    isTemplate: data.is_template,
    isPublished: data.is_published,
  };
}
