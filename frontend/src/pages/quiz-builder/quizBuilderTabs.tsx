import { TFunction } from 'i18next';
import { AcademicCapIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export const getQuizBuilderTabs = (t: TFunction, questionsCount: number) => [
  {
    id: 'basic' as const,
    icon: <AcademicCapIcon className="mr-2 inline-block h-5 w-5" />,
    label: t('quiz.basicInfo', 'Basic Information'),
  },
  {
    id: 'questions' as const,
    icon: <CheckCircleIcon className="mr-2 inline-block h-5 w-5" />,
    label: `${t('quiz.questions', 'Questions')} (${questionsCount})`,
  },
  {
    id: 'settings' as const,
    icon: <ClockIcon className="mr-2 inline-block h-5 w-5" />,
    label: t('quiz.settings', 'Settings'),
  },
];
