export const LANG_MAP: Record<string, string> = {
  python: 'python',
  java: 'java',
  javascript: 'javascript',
  cpp: 'cpp',
};

export const VPL_LANGUAGES = ['python', 'java', 'javascript', 'cpp'] as const;
export type VplLanguage = typeof VPL_LANGUAGES[number];

export const VPL_CHECK_MODES = ['EXACT', 'TRIM', 'CONTAINS', 'REGEX'] as const;
export type VplCheckMode = typeof VPL_CHECK_MODES[number];

export const VPL_SPLIT_PANE_INITIAL_PCT = 60;
export const VPL_SPLIT_PANE_MIN_PCT = 30;
export const VPL_SPLIT_PANE_MAX_PCT = 80;
