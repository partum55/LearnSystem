import { learningItemsApi } from './learning-items.api';
import type { LessonBlockDto } from '@/features/courses/api/canonical.types';

export interface LessonStep {
  id: string;
  lessonId: string;
  blockType: 'TEXT' | 'VIDEO' | 'QUIZ';
  title: string;
  content: string;
  contentFormat: string;
  position: number;
  questions: Array<Record<string, unknown>>;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  position: number;
  isPublished: boolean;
  steps?: LessonStep[];
}

export interface StepProgress {
  stepId: string;
  title: string;
  blockType: string;
  completed: boolean;
  unlocked: boolean;
}

export interface LessonProgress {
  totalSteps: number;
  completedSteps: number;
  steps: StepProgress[];
}

const blockToStep = (lessonId: string, block: LessonBlockDto): LessonStep => ({
  id: block.id,
  lessonId,
  blockType:
    block.type === 'inline_quiz_question' ? 'QUIZ' :
      block.type === 'video' ? 'VIDEO' : 'TEXT',
  title: block.title || '',
  content: block.content || '',
  contentFormat: block.contentFormat || 'RICH',
  position: block.order,
  questions: block.type === 'inline_quiz_question'
    ? [block.settings || {}]
    : [],
});

export const lessonsApi = {
  getById: async (id: string) => {
    const [item, blocks] = await Promise.all([
      learningItemsApi.get(id),
      learningItemsApi.listBlocks(id),
    ]);
    return {
      data: {
        id: item.id,
        moduleId: item.moduleId,
        title: item.title,
        summary: item.description || '',
        position: item.order,
        isPublished: item.visibilityStatus !== 'HIDDEN' && item.visibilityStatus !== 'ARCHIVED',
        steps: blocks.map((block) => blockToStep(id, block)),
      } satisfies Lesson,
    };
  },

  create: (data: { moduleId: string; courseId?: string; title: string; summary?: string }) => {
    if (!data.courseId) {
      return Promise.reject(new Error('courseId is required to create a lesson learning item'));
    }
    return learningItemsApi.create(data.courseId, data.moduleId, {
      type: 'lesson',
      title: data.title,
      description: data.summary,
      visible: false,
    }).then((item) => ({
      data: {
        id: item.id,
        moduleId: item.moduleId,
        title: item.title,
        summary: item.description || '',
        position: item.order,
        isPublished: item.visibilityStatus !== 'HIDDEN',
        steps: [],
      } satisfies Lesson,
    }));
  },

  update: async (id: string, data: { title?: string; summary?: string; isPublished?: boolean }) => {
    const current = await learningItemsApi.get(id);
    const updated = await learningItemsApi.update(id, {
      type: 'lesson',
      title: data.title ?? current.title,
      description: data.summary ?? current.description ?? undefined,
      order: current.order,
      visible: data.isPublished,
      settings: current.settings,
    });
    return {
      data: {
        id: updated.id,
        moduleId: updated.moduleId,
        title: updated.title,
        summary: updated.description || '',
        position: updated.order,
        isPublished: updated.visibilityStatus !== 'HIDDEN',
        steps: [],
      } satisfies Lesson,
    };
  },

  addStep: (lessonId: string, data: { blockType: string; title: string; content?: string; questions?: Array<Record<string, unknown>> }) =>
    learningItemsApi.createBlock(lessonId, {
      type: data.blockType === 'QUIZ' ? 'inline_quiz_question' : data.blockType.toLowerCase(),
      title: data.title,
      content: data.content,
      settings: data.questions?.[0],
    }).then((block) => ({ data: blockToStep(lessonId, block) })),

  updateStep: (lessonId: string, stepId: string, data: { title?: string; content?: string; blockType?: string; questions?: Array<Record<string, unknown>> }) =>
    learningItemsApi.updateBlock(lessonId, stepId, {
      type: data.blockType === 'QUIZ' ? 'inline_quiz_question' : (data.blockType || 'TEXT').toLowerCase(),
      title: data.title,
      content: data.content,
      settings: data.questions?.[0],
    }).then((block) => ({ data: blockToStep(lessonId, block) })),

  deleteStep: (lessonId: string, stepId: string) =>
    learningItemsApi.deleteBlock(lessonId, stepId).then(() => ({ data: undefined })),

  completeStep: (lessonId: string, stepId: string) => {
    void lessonId;
    return Promise.resolve({ data: { stepId, completedAt: new Date().toISOString() } });
  },

  getProgress: async (lessonId: string) => {
    const blocks = await learningItemsApi.listBlocks(lessonId);
    return {
      data: {
        totalSteps: blocks.length,
        completedSteps: 0,
        steps: blocks.map((block, index) => ({
          stepId: block.id,
          title: block.title || '',
          blockType: block.type,
          completed: false,
          unlocked: index === 0,
        })),
      } satisfies LessonProgress,
    };
  },
};
