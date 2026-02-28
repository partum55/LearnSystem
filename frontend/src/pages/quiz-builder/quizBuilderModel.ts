export type QuestionType =
  | 'single_choice'
  | 'multiple_response'
  | 'short_answer'
  | 'essay'
  | 'numeric'
  | 'matching'
  | 'ordering'
  | 'true_false';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id?: string | number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  choices?: string[];
  correct_answer?: string | string[] | number;
  explanation?: string;
  required?: boolean;
  numeric_tolerance?: number;
  matching_pairs?: MatchingPair[];
  ordering_items?: string[];
}

export interface QuizSectionRule {
  id?: string;
  question_type?: string;
  difficulty?: string;
  tag?: string;
  quota: number;
}

export interface QuizSection {
  id?: string;
  title: string;
  position: number;
  question_count: number;
  rules: QuizSectionRule[];
}

export interface QuizSettings {
  show_results_after: 'immediate' | 'after_due' | 'manual';
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  one_question_at_time: boolean;
  allow_backtrack: boolean;
  require_lockdown_browser: boolean;
  show_point_values: boolean;
}

export interface Quiz {
  id?: string | number;
  title: string;
  description: string;
  instructions?: string;
  course?: string;
  time_limit?: number;
  attempts_allowed: number;
  available_from?: string;
  available_until?: string;
  passing_score?: number;
  questions: Question[];
  sections: QuizSection[];
  settings: QuizSettings;
}

export type QuizBuilderTab = 'basic' | 'questions' | 'settings';

export type QuizSettingsToggleKey = Exclude<keyof QuizSettings, 'show_results_after'>;

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  show_results_after: 'immediate',
  shuffle_questions: false,
  shuffle_answers: false,
  show_correct_answers: true,
  one_question_at_time: false,
  allow_backtrack: true,
  require_lockdown_browser: false,
  show_point_values: true,
};

export const QUIZ_QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; labelKey: string; defaultLabel: string }> = [
  { value: 'single_choice', labelKey: 'quiz.singleChoice', defaultLabel: 'Single Choice' },
  { value: 'multiple_response', labelKey: 'quiz.multipleResponse', defaultLabel: 'Multiple Response' },
  { value: 'true_false', labelKey: 'quiz.trueFalse', defaultLabel: 'True/False' },
  { value: 'short_answer', labelKey: 'quiz.shortAnswer', defaultLabel: 'Short Answer' },
  { value: 'numeric', labelKey: 'quiz.numeric', defaultLabel: 'Numeric' },
  { value: 'matching', labelKey: 'quiz.matching', defaultLabel: 'Matching' },
  { value: 'ordering', labelKey: 'quiz.ordering', defaultLabel: 'Ordering' },
  { value: 'essay', labelKey: 'quiz.essay', defaultLabel: 'Essay' },
];

export const QUIZ_SETTINGS_TOGGLE_OPTIONS: Array<{ key: QuizSettingsToggleKey; labelKey: string; defaultLabel: string }> = [
  { key: 'shuffle_questions', labelKey: 'quiz.shuffleQuestions', defaultLabel: 'Shuffle questions' },
  { key: 'shuffle_answers', labelKey: 'quiz.shuffleAnswers', defaultLabel: 'Shuffle answer choices' },
  {
    key: 'show_correct_answers',
    labelKey: 'quiz.showCorrectAnswers',
    defaultLabel: 'Show correct answers after submission',
  },
  { key: 'show_point_values', labelKey: 'quiz.showPointValues', defaultLabel: 'Show point values' },
  { key: 'one_question_at_time', labelKey: 'quiz.oneQuestionAtTime', defaultLabel: 'Show one question at a time' },
  {
    key: 'allow_backtrack',
    labelKey: 'quiz.allowBacktrack',
    defaultLabel: 'Allow students to go back to previous questions',
  },
  { key: 'require_lockdown_browser', labelKey: 'quiz.requireLockdown', defaultLabel: 'Require lockdown browser' },
];

export const createInitialQuiz = (): Quiz => ({
  title: '',
  description: '',
  instructions: '',
  time_limit: 60,
  attempts_allowed: 1,
  passing_score: 70,
  questions: [],
  sections: [],
  settings: { ...DEFAULT_QUIZ_SETTINGS },
});

export const createQuestion = (type: QuestionType = 'single_choice'): Question => {
  const question: Question = {
    question_text: '',
    question_type: type,
    points: 1,
    required: true,
  };

  if (type === 'single_choice' || type === 'multiple_response') {
    question.choices = ['', '', '', ''];
    question.correct_answer = type === 'multiple_response' ? [] : '';
  } else if (type === 'true_false') {
    question.choices = ['True', 'False'];
    question.correct_answer = '';
  } else if (type === 'numeric') {
    question.correct_answer = 0;
    question.numeric_tolerance = 0.01;
  } else if (type === 'matching') {
    question.matching_pairs = [{ left: '', right: '' }, { left: '', right: '' }];
  } else if (type === 'ordering') {
    question.ordering_items = ['', '', ''];
  }

  return question;
};

export const applyQuestionTypeDefaults = (question: Question, type: QuestionType): Question => {
  const baseQuestion: Question = {
    ...question,
    question_type: type,
  };

  if (type === 'single_choice' || type === 'multiple_response') {
    return {
      ...baseQuestion,
      choices: ['', '', '', ''],
      correct_answer: type === 'multiple_response' ? [] : '',
      numeric_tolerance: undefined,
      matching_pairs: undefined,
      ordering_items: undefined,
    };
  }

  if (type === 'true_false') {
    return {
      ...baseQuestion,
      choices: ['True', 'False'],
      correct_answer: '',
      numeric_tolerance: undefined,
      matching_pairs: undefined,
      ordering_items: undefined,
    };
  }

  if (type === 'numeric') {
    return {
      ...baseQuestion,
      choices: undefined,
      correct_answer: 0,
      numeric_tolerance: 0.01,
      matching_pairs: undefined,
      ordering_items: undefined,
    };
  }

  if (type === 'matching') {
    return {
      ...baseQuestion,
      choices: undefined,
      correct_answer: undefined,
      numeric_tolerance: undefined,
      matching_pairs: [{ left: '', right: '' }, { left: '', right: '' }],
      ordering_items: undefined,
    };
  }

  if (type === 'ordering') {
    return {
      ...baseQuestion,
      choices: undefined,
      correct_answer: undefined,
      numeric_tolerance: undefined,
      matching_pairs: undefined,
      ordering_items: ['', '', ''],
    };
  }

  return {
    ...baseQuestion,
    choices: undefined,
    correct_answer: '',
    numeric_tolerance: undefined,
    matching_pairs: undefined,
    ordering_items: undefined,
  };
};
