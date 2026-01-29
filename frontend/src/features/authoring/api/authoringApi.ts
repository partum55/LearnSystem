import apiClient from '../../../api/client';
import { AuthoringEndpoints, AuthoringResponse, TaskDraft, ValidationResult, PreviewPayload } from '../types';

export const defaultAuthoringEndpoints: AuthoringEndpoints = {
  createTask: '/authoring/tasks',
  updateTask: (id: string) => `/authoring/tasks/${id}`,
  validateTask: '/authoring/tasks/validate',
  previewTask: '/authoring/tasks/preview',
};

export const createAuthoringApi = (
  endpoints: AuthoringEndpoints = defaultAuthoringEndpoints
) => ({
  createTask: (payload: TaskDraft) =>
    apiClient.post<AuthoringResponse<TaskDraft>>(endpoints.createTask, payload),

  updateTask: (id: string, payload: Partial<TaskDraft>) =>
    apiClient.put<AuthoringResponse<TaskDraft>>(endpoints.updateTask(id), payload),

  validateTask: (payload: TaskDraft) =>
    apiClient.post<AuthoringResponse<ValidationResult>>(endpoints.validateTask, payload),

  previewTask: (payload: PreviewPayload) =>
    apiClient.post<AuthoringResponse<string>>(endpoints.previewTask, payload),
});
