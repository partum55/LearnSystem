import { VplTestCase } from '@/api/types';

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
    void req;
    throw new Error('TODO VPL boundary: code execution must call vpl-service, not learning-service.');
  },

  execute: async (req: ExecuteRequest): Promise<CodeExecutionResult> => {
    void req;
    throw new Error('TODO VPL boundary: code execution must call vpl-service, not learning-service.');
  },

  testCases: {
    list: async (assignmentId: string): Promise<VplTestCase[]> => {
      void assignmentId;
      return [];
    },

    create: async (assignmentId: string, dto: Omit<VplTestCase, 'id' | 'assignmentId'>): Promise<VplTestCase> => {
      void assignmentId;
      void dto;
      throw new Error('TODO canonical API: VPL test-case authoring belongs to vpl-service metadata integration.');
    },

    update: async (assignmentId: string, testId: string, dto: Partial<VplTestCase>): Promise<VplTestCase> => {
      void assignmentId;
      void testId;
      void dto;
      throw new Error('TODO canonical API: VPL test-case authoring belongs to vpl-service metadata integration.');
    },

    delete: async (assignmentId: string, testId: string): Promise<void> => {
      void assignmentId;
      void testId;
      throw new Error('TODO canonical API: VPL test-case authoring belongs to vpl-service metadata integration.');
    },

    reorder: async (assignmentId: string, orderedIds: string[]): Promise<void> => {
      void assignmentId;
      void orderedIds;
      throw new Error('TODO canonical API: VPL test-case authoring belongs to vpl-service metadata integration.');
    },
  },
};
