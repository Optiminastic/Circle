/**
 * Question Library categories — shared metadata for the landing table and each
 * category's detail page so titles, icons, and routes stay in one place.
 */
import {
  ShieldCheck,
  BrainCircuit,
  ClipboardList,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

export interface QuestionCategory {
  /** URL segment — /question-library/<slug>. */
  slug: string;
  title: string;
  /** Short tag shown under the title (where the bank is used). */
  subtitle: string;
  description: string;
  Icon: LucideIcon;
}

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    slug: 'screening-questions',
    title: 'Must-have & Good-to-have Questions',
    subtitle: 'Screening',
    description: 'Qualifying questions applicants answer on the public job posting.',
    Icon: ShieldCheck,
  },
  {
    slug: 'iq-questions',
    title: 'IQ Questions',
    subtitle: 'Aptitude test',
    description: 'Aptitude and reasoning questions used in the IQ assessment.',
    Icon: BrainCircuit,
  },
  {
    slug: 'assessment-questions',
    title: 'Assessment Questions',
    subtitle: 'Take-home assignment',
    description: 'Role-specific assignment and evaluation questions.',
    Icon: ClipboardList,
  },
  {
    slug: 'interview-questions',
    title: 'Interview Questions',
    subtitle: 'Interview rounds',
    description: 'Structured questions for HR and technical interview rounds.',
    Icon: CalendarDays,
  },
];

export const findCategory = (slug: string): QuestionCategory | undefined =>
  QUESTION_CATEGORIES.find(c => c.slug === slug);
