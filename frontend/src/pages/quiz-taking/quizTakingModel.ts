export interface Question {
  id: string;
  question_type: string;
  stem: string;
  options?: { choices: string[] };
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit: number | null;
  attempts_allowed: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  questions: Array<{ id: string; question: Question; position: number }>;
}

export interface StudentAnswer {
  selected_index?: number;
  value?: boolean;
  text?: string;
  [key: string]: unknown;
}

export interface QuizAttempt {
  id: string;
  attempt_number: number;
  started_at: string;
  answers: Record<string, StudentAnswer>;
}

export interface ApiQuestion {
  id: string;
  questionType: string;
  stem: string;
  options?: { choices?: string[] };
  points: number;
}

export interface ApiQuizQuestion {
  id: string;
  questionId?: string;
  position: number;
  effectivePoints?: number;
  question?: ApiQuestion;
}

export interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  timeLimit?: number | null;
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  questions?: ApiQuizQuestion[];
}

export interface ApiQuizAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  answers?: Record<string, unknown>;
}

export const mapQuiz = (apiQuiz: ApiQuiz): Quiz => {
  const mappedQuestions = (apiQuiz.questions || []).map((question) => ({
    id: question.id,
    position: question.position,
    question: {
      id: question.question?.id || question.questionId || '',
      question_type: question.question?.questionType || 'SHORT_ANSWER',
      stem: question.question?.stem || '',
      options: question.question?.options?.choices
        ? { choices: question.question.options.choices }
        : undefined,
      points: Number(question.effectivePoints ?? question.question?.points ?? 0),
    },
  }));

  return {
    id: apiQuiz.id,
    title: apiQuiz.title,
    description: apiQuiz.description,
    time_limit: apiQuiz.timeLimit ?? null,
    attempts_allowed: apiQuiz.attemptsAllowed ?? 1,
    shuffle_questions: Boolean(apiQuiz.shuffleQuestions),
    shuffle_answers: Boolean(apiQuiz.shuffleAnswers),
    questions: mappedQuestions,
  };
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
    const questionId = quizQuestion.question.id;
    if (!questionId || !(questionId in apiAnswers)) {
      continue;
    }

    const answerValue = apiAnswers[questionId];

    if (quizQuestion.question.question_type === 'MULTIPLE_CHOICE') {
      const choices = quizQuestion.question.options?.choices || [];
      const selectedIndex = choices.findIndex((choice) => choice === answerValue);
      result[questionId] =
        selectedIndex >= 0 ? { selected_index: selectedIndex } : { text: String(answerValue) };
    } else if (quizQuestion.question.question_type === 'TRUE_FALSE') {
      result[questionId] = { value: Boolean(answerValue) };
    } else if (
      quizQuestion.question.question_type === 'FILL_BLANK' &&
      typeof answerValue === 'object' &&
      answerValue !== null
    ) {
      const answersArray = (answerValue as { answers?: string[] }).answers || [];
      result[questionId] = { text: answersArray[0] || '' };
    } else if (typeof answerValue === 'string') {
      result[questionId] = { text: answerValue };
    } else {
      result[questionId] = { text: String(answerValue ?? '') };
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
    const questionId = quizQuestion.question.id;
    const answer = answers[questionId];
    if (!answer) {
      return;
    }

    if (quizQuestion.question.question_type === 'MULTIPLE_CHOICE') {
      const choices = quizQuestion.question.options?.choices || [];
      if (typeof answer.selected_index === 'number' && choices[answer.selected_index] !== undefined) {
        answerPayload[questionId] = choices[answer.selected_index];
      } else if (answer.text) {
        answerPayload[questionId] = answer.text;
      }
      return;
    }

    if (quizQuestion.question.question_type === 'TRUE_FALSE') {
      if (typeof answer.value === 'boolean') {
        answerPayload[questionId] = answer.value;
      }
      return;
    }

    if (quizQuestion.question.question_type === 'FILL_BLANK') {
      answerPayload[questionId] = { answers: [answer.text || ''] };
      return;
    }

    answerPayload[questionId] = answer.text || '';
  });

  return answerPayload;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
