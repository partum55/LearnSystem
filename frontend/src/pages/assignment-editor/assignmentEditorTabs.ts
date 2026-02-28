import { TFunction } from 'i18next';
import { AssignmentEditorTab } from './assignmentEditorModel';

export interface AssignmentEditorTabItem {
  id: AssignmentEditorTab;
  label: string;
  icon: string;
}

export const getAssignmentEditorTabs = (t: TFunction): AssignmentEditorTabItem[] => [
  { id: 'basic', label: t('assignment.tabs.basic'), icon: '📝' },
  { id: 'content', label: t('assignment.tabs.content'), icon: '📄' },
  { id: 'settings', label: t('assignment.tabs.settings'), icon: '⚙️' },
  { id: 'grading', label: t('assignment.tabs.grading'), icon: '✓' },
  { id: 'advanced', label: t('assignment.tabs.advanced'), icon: '🔧' },
];
