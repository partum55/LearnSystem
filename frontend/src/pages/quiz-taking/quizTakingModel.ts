export interface Question {
  id: string;
  question_type: string;
  stem: string;
  promptDocument?: { version: number; type: 'doc'; meta?: Record<string, unknown>; content: unknown[] };
  options?: {
    choices?: string[];
    pairs?: Array<{ left: string; right: string }>;
  };
  points: number;
}

export interface AttemptQuestion {
  id: string;
  position: number;
  question_id: string;
  question: Question;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  questions: AttemptQuestion[];
}

export interface StudentAnswer {
  selected_index?: number;
  selected_indices?: number[];
  value?: boolean | number;
  text?: string;
  pairs?: Record<string, string>;
  order?: string[];
  [key: string]: unknown;
}

export interface QuizAttempt {
  id: string;
  attempt_number: number;
  started_at: string;
  answers: Record<string, StudentAnswer>;
}

export interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  timeLimit?: number | null;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}

export interface ApiQuizAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  answers?: Record<string, unknown>;
}

export interface ApiAttemptQuestion {
  id: string;
  questionId: string;
  position: number;
  points: number;
  promptSnapshot?: Record<string, unknown>;
  payloadSnapshot?: Record<string, unknown>;
}

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item ?? '')).filter((item) => item.length > 0);
};

const normalizeQuestionType = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return 'SINGLE_CHOICE';
    case 'MULTIPLE_RESPONSE':
    case 'MULTI_SELECT':
      return 'MULTIPLE_RESPONSE';
    case 'TRUE_FALSE':
      return 'TRUE_FALSE';
    case 'NUMERIC':
    case 'NUMERICAL':
      return 'NUMERIC';
    case 'MATCHING':
      return 'MATCHING';
    case 'ORDERING':
      return 'ORDERING';
    case 'ESSAY':
      return 'ESSAY';
    case 'SHORT_ANSWER':
      return 'SHORT_ANSWER';
    default:
      return normalized || 'SHORT_ANSWER';
  }
};

const extractText = (node: unknown): string => {
  if (!node || typeof node !== 'object') {
    return '';
  }
  const record = node as Record<string, unknown>;
  if (typeof record.text === 'string') {
    return record.text;
  }
  if (!Array.isArray(record.content)) {
    return '';
  }
  return record.content.map(extractText).join('');
};

const extractStemFromPrompt = (promptSnapshot?: Record<string, unknown>): string => {
  if (!promptSnapshot) {
    return '';
  }
  return extractText(promptSnapshot).trim();
};

export const mapQuizMeta = (apiQuiz: ApiQuiz): Quiz => ({
  id: apiQuiz.id,
  title: apiQuiz.title,
  description: apiQuiz.description,
  time_limit: apiQuiz.timeLimit ?? null,
  attempts_allowed: apiQuiz.attemptsAllowed ?? 1,
  shuffle_questions: Boolean(apiQuiz.shuffleQuestions),
  shuffle_answers: Boolean(apiQuiz.shuffleAnswers),
  questions: [],
});

export const mapAttemptQuestions = (apiQuestions: ApiAttemptQuestion[]): AttemptQuestion[] => {
  return apiQuestions
    .map((item) => {
      const payload = (item.payloadSnapshot || {}) as Record<string, unknown>;
      const rawOptions = payload.options;
      const options =
        rawOptions && typeof rawOptions === 'object'
          ? (rawOptions as Record<string, unknown>)
          : {};

      const pairsFromOptions = Array.isArray(options.pairs)
        ? options.pairs
            .map((pair) => {
              if (!pair || typeof pair !== 'object') return null;
              const left = String((pair as Record<string, unknown>).left ?? '');
              const right = String((pair as Record<string, unknown>).right ?? '');
              return { left, right };
            })
            .filter((pair): pair is { left: string; right: string } => Boolean(pair))
        : [];

      const questionType = normalizeQuestionType(
        String(payload.questionType ?? payload.question_type ?? '')
      );

      const promptDoc = item.promptSnapshot &&
        typeof item.promptSnapshot === 'object' &&
        Array.isArray((item.promptSnapshot as Record<string, unknown>).content)
        ? (item.promptSnapshot as { version: number; type: 'doc'; meta?: Record<string, unknown>; content: unknown[] })
        : undefined;

      return {
        id: item.id,
        question_id: item.questionId,
        position: item.position,
        question: {
          id: item.id,
          question_type: questionType,
          stem: extractStemFromPrompt(item.promptSnapshot),
          promptDocument: promptDoc,
          options: {
            choices: readStringArray(options.choices),
            pairs: pairsFromOptions,
          },
          points: Number(item.points ?? 0),
        },
      };
    })
    .sort((a, b) => a.position - b.position);
};

export const mapAttemptAnswersFromApi = (
  quizData: Quiz,
  apiAnswers?: Record<string, unknown>
): Record<string, StudentAnswer> => {
  if (!apiAnswers) {
    return {};
  }

  const result: Record<string, StudentAnswer> = {};

  for (const quizQuestion of quizData.questions) {
    const attemptQuestionId = quizQuestion.id;
    if (!attemptQuestionId || !(attemptQuestionId in apiAnswers)) {
      continue;
    }

    const answerValue = apiAnswers[attemptQuestionId];
    const questionType = quizQuestion.question.question_type;
    const choices = quizQuestion.question.options?.choices || [];

    if (questionType === 'SINGLE_CHOICE') {
      const selectedIndex = choices.findIndex((choice) => choice === String(answerValue));
      result[attemptQuestionId] =
        selectedIndex >= 0 ? { selected_index: selectedIndex } : { text: String(answerValue) };
    } else if (questionType === 'MULTIPLE_RESPONSE') {
      const values = readStringArray(answerValue);
      const selectedIndices = values
        .map((value) => choices.findIndex((choice) => choice === value))
        .filter((idx) => idx >= 0);
      result[attemptQuestionId] = { selected_indices: selectedIndices };
    } else if (questionType === 'TRUE_FALSE') {
      result[attemptQuestionId] = { value: String(answerValue).toLowerCase() === 'true' };
    } else if (questionType === 'NUMERIC') {
      result[attemptQuestionId] = { value: Number(answerValue) };
    } else if (questionType === 'MATCHING' && typeof answerValue === 'object' && answerValue !== null) {
      const pairs = (answerValue as { pairs?: Record<string, string> }).pairs || {};
      result[attemptQuestionId] = { pairs };
    } else if (questionType === 'ORDERING') {
      result[attemptQuestionId] = { order: readStringArray(answerValue) };
    } else if (typeof answerValue === 'string') {
      result[attemptQuestionId] = { text: answerValue };
    } else {
      result[attemptQuestionId] = { text: String(answerValue ?? '') };
    }
  }

  return result;
};

export const buildQuizSubmitPayload = (
  questions: Quiz['questions'],
  answers: Record<string, StudentAnswer>
): Record<string, unknown> => {
  const answerPayload: Record<string, unknown> = {};

  questions.forEach((quizQuestion) => {
    const attemptQuestionId = quizQuestion.id;
    const answer = answers[attemptQuestionId];
    if (!answer) {
      return;
    }

    const questionType = quizQuestion.question.question_type;
    const choices = quizQuestion.question.options?.choices || [];

    if (questionType === 'SINGLE_CHOICE') {
      if (typeof answer.selected_index === 'number' && choices[answer.selected_index] !== undefined) {
        answerPayload[attemptQuestionId] = choices[answer.selected_index];
      } else if (answer.text) {
        answerPayload[attemptQuestionId] = answer.text;
      }
      return;
    }

    if (questionType === 'MULTIPLE_RESPONSE') {
      const selected = (answer.selected_indices || [])
        .map((idx) => choices[idx])
        .filter((choice): choice is string => Boolean(choice));
      answerPayload[attemptQuestionId] = selected;
      return;
    }

    if (questionType === 'TRUE_FALSE') {
      if (typeof answer.value === 'boolean') {
        answerPayload[attemptQuestionId] = answer.value ? 'true' : 'false';
      }
      return;
    }

    if (questionType === 'NUMERIC') {
      answerPayload[attemptQuestionId] = answer.value ?? answer.text ?? '';
      return;
    }

    if (questionType === 'MATCHING') {
      answerPayload[attemptQuestionId] = { pairs: answer.pairs || {} };
      return;
    }

    if (questionType === 'ORDERING') {
      answerPayload[attemptQuestionId] = answer.order || [];
      return;
    }

    answerPayload[attemptQuestionId] = answer.text || '';
  });

  return answerPayload;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
