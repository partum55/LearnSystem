import { TFunction } from 'i18next';
import {
  AcademicCapIcon,
  DocumentTextIcon,
  FolderIcon,
  MegaphoneIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

export interface CourseDetailTab {
  id: CourseDetailTabId;
  name: string;
  icon: typeof AcademicCapIcon;
}

export interface DeleteConfirmationState {
  type: 'module' | 'resource' | 'assignment';
  id: string;
  moduleId?: string;
  title: string;
}

export type CourseDetailTabId =
  | 'modules'
  | 'syllabus'
  | 'announcements'
  | 'assignments'
  | 'members'
  | 'grades';

const COURSE_DETAIL_TABS: CourseDetailTabId[] = [
  'modules',
  'syllabus',
  'announcements',
  'assignments',
  'members',
  'grades',
];

export const isCourseDetailTabId = (tab: string | null): tab is CourseDetailTabId =>
  Boolean(tab && COURSE_DETAIL_TABS.includes(tab as CourseDetailTabId));

export const getInitialTab = (courseId: string | undefined, urlTab: string | null): CourseDetailTabId => {
  if (isCourseDetailTabId(urlTab)) {
    return urlTab;
  }

  if (!courseId) {
    return 'modules';
  }

  const storedTab = sessionStorage.getItem(`course_${courseId}_tab`);
  if (isCourseDetailTabId(storedTab)) {
    return storedTab;
  }

  return 'modules';
};

export const getInitialExpandedModules = (courseId: string | undefined): Set<string> => {
  if (!courseId) {
    return new Set();
  }

  try {
    const stored = sessionStorage.getItem(`course_${courseId}_expanded`);
    if (!stored) {
      return new Set();
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
};

export const getCourseDetailTabs = (t: TFunction): CourseDetailTab[] => [
  { id: 'modules', name: t('courses.modules'), icon: FolderIcon },
  { id: 'syllabus', name: t('courses.syllabus', 'Syllabus'), icon: DocumentTextIcon },
  { id: 'announcements', name: t('announcements.title', 'Announcements'), icon: MegaphoneIcon },
  { id: 'assignments', name: t('assignments.title'), icon: DocumentTextIcon },
  { id: 'members', name: t('courses.students'), icon: UserGroupIcon },
  { id: 'grades', name: t('gradebook.title'), icon: AcademicCapIcon },
];
