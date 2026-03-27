import apiClient from './client';
import { VplTestCase } from '../types';

export interface RunCodeRequest {
  language: string;
  code: string;
  stdin?: string;
  timeLimitSeconds?: number;
  memoryLimitMb?: number;
}

export interface ExecuteRequest {
  assignmentId: string;
  code: string;
  language: string;
  input?: string;
}

export interface TestCaseResult {
  name: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  points: number;
  hidden?: boolean;
}

export interface PylintResult {
  score: number;
  passed: boolean;
}

export interface CodeExecutionResult {
  output?: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  success: boolean;
  testResults?: TestCaseResult[];
  pylint?: PylintResult;
  totalPoints?: number;
  maxPoints?: number;
}

export const virtualLabApi = {
  runCode: async (req: RunCodeRequest): Promise<CodeExecutionResult> => {
    const res = await apiClient.post<CodeExecutionResult>('/virtual-lab/run-code', req);
    return res.data;
  },

  execute: async (req: ExecuteRequest): Promise<CodeExecutionResult> => {
    const res = await apiClient.post<CodeExecutionResult>('/virtual-lab/execute', req);
    return res.data;
  },

  testCases: {
    list: async (assignmentId: string): Promise<VplTestCase[]> => {
      const res = await apiClient.get<VplTestCase[]>(`/assignments/${assignmentId}/test-cases`);
      return res.data;
    },

    create: async (assignmentId: string, dto: Omit<VplTestCase, 'id' | 'assignmentId'>): Promise<VplTestCase> => {
      const res = await apiClient.post<VplTestCase>(`/assignments/${assignmentId}/test-cases`, dto);
      return res.data;
    },

    update: async (assignmentId: string, testId: string, dto: Partial<VplTestCase>): Promise<VplTestCase> => {
      const res = await apiClient.put<VplTestCase>(`/assignments/${assignmentId}/test-cases/${testId}`, dto);
      return res.data;
    },

    delete: async (assignmentId: string, testId: string): Promise<void> => {
      await apiClient.delete(`/assignments/${assignmentId}/test-cases/${testId}`);
    },

    reorder: async (assignmentId: string, orderedIds: string[]): Promise<void> => {
      await apiClient.put(`/assignments/${assignmentId}/test-cases/reorder`, orderedIds);
    },
  },
};
