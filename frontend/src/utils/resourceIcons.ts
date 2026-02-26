import {
  DocumentTextIcon,
  DocumentIcon,
  LinkIcon,
  FilmIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

export const resourceTypeInfo: Record<string, { icon: React.ElementType; label: string; accent: string }> = {
  TEXT:  { icon: DocumentTextIcon,  label: 'Text',     accent: 'rgba(34,197,94,0.15)' },
  PDF:   { icon: DocumentIcon,      label: 'PDF',      accent: 'rgba(239,68,68,0.12)' },
  LINK:  { icon: LinkIcon,          label: 'Link',     accent: 'rgba(59,130,246,0.12)' },
  VIDEO: { icon: FilmIcon,          label: 'Video',    accent: 'rgba(168,85,247,0.12)' },
  CODE:  { icon: CodeBracketIcon,   label: 'Code',     accent: 'rgba(234,179,8,0.12)' },
  SLIDE: { icon: DocumentTextIcon,  label: 'Slides',   accent: 'rgba(249,115,22,0.12)' },
  OTHER: { icon: DocumentIcon,      label: 'File',     accent: 'rgba(161,161,170,0.10)' },
};
