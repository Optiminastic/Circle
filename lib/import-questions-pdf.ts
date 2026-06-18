/**
 * Client-side importer that turns an assessment PDF into editable MCQ questions.
 *
 * The expected PDF layout (one assessment per file) looks like:
 *
 *   Assessment: CSM (Signalor)
 *   Duration: 30 Minutes
 *   Questions: 20 MCQs
 *   <optional section heading>
 *   Q1. <question text, may wrap across lines>
 *   A. <option>
 *   B. <option>
 *   C. <option>
 *   D. <option>
 *   Answer: B
 *   ...
 *
 * Text is extracted with pdf.js entirely in the browser (no upload), then a
 * small line-based state machine reconstructs each question. The result reuses
 * the exact `TestQuestion` shape the editor already renders, so imported
 * questions stay fully editable.
 */
import type { TestQuestion } from '@/data/test-banks';
import {
  INTERVIEW_MODULES,
  SCREENING_MIN_OPTIONS,
  SCREENING_MAX_OPTIONS,
  type InterviewModule,
} from '@/lib/question-banks';

export interface ParsedAssessment {
  /** "CSM (Signalor)" — from the `Assessment:` line, if present. */
  title?: string;
  /** Duration in minutes — from the `Duration:` line, if present. */
  durationMin?: number;
  questions: TestQuestion[];
  /** Question numbers that were found but could not be fully parsed. */
  skipped: number[];
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Pull text lines out of a PDF, preserving the document's own line breaks. */
async function extractLines(file: File): Promise<string[]> {
  // pdf.js is browser-only and heavy, so load it lazily on first use.
  const pdfjs = await import('pdfjs-dist');
  // Worker is copied into /public at build setup time so it loads regardless
  // of the bundler (webpack / turbopack) in use.
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let current = '';
    for (const item of content.items) {
      // TextItem has `str` and `hasEOL`; TextMarkedContent has neither.
      if (!('str' in item)) continue;
      current += item.str;
      if (item.hasEOL) {
        lines.push(current);
        current = '';
      }
    }
    if (current.trim()) lines.push(current);
  }
  await loadingTask.destroy();
  return lines;
}

interface Draft {
  num: number;
  q: string;
  options: string[];
  answer: number | null;
}

const toTuple = (opts: string[]): TestQuestion['options'] => {
  const four = [...opts];
  while (four.length < 4) four.push('');
  return four.slice(0, 4) as TestQuestion['options'];
};

/** Run the line-based state machine that rebuilds each question. */
function parseLines(lines: string[]): ParsedAssessment {
  const result: ParsedAssessment = { questions: [], skipped: [] };

  let draft: Draft | null = null;
  // What the next continuation line belongs to: the question ('q'), an option
  // letter, or nothing (e.g. after `Answer:` / inside section headings).
  let target: 'q' | 'A' | 'B' | 'C' | 'D' | null = null;

  const commit = () => {
    if (!draft) return;
    const filled = draft.options.filter(o => o.trim()).length;
    if (draft.q.trim() && draft.answer !== null && filled >= 2) {
      result.questions.push({
        id: `Q-IMP-${draft.num}-${result.questions.length}`,
        q: draft.q.trim(),
        options: toTuple(draft.options.map(o => o.trim())),
        answer: draft.answer,
      });
    } else {
      result.skipped.push(draft.num);
    }
    draft = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Document metadata (only read before the first question).
    if (!draft) {
      const titleM = line.match(/^Assessment\s*[:\-]\s*(.+)$/i);
      if (titleM) {
        result.title = titleM[1].trim();
        continue;
      }
      const durM = line.match(/^Duration\s*[:\-]\s*(\d+)/i);
      if (durM) {
        result.durationMin = Number(durM[1]);
        continue;
      }
    }

    // New question: "Q1.", "Q1)", "Q 1 -", "1." etc.
    const qM = line.match(/^Q?\s*(\d{1,3})\s*[.):\-]\s*(.*)$/i);
    if (qM && /^Q/i.test(line)) {
      commit();
      draft = { num: Number(qM[1]), q: qM[2] || '', options: [], answer: null };
      target = 'q';
      continue;
    }

    // Answer line: "Answer: B".
    const aM = line.match(/^Answer\s*[:\-]?\s*([A-D])\b/i);
    if (aM && draft) {
      draft.answer = OPTION_LETTERS.indexOf(aM[1].toUpperCase() as 'A');
      target = null;
      continue;
    }

    // Option line: "A. text" / "B) text" — the punctuation guards against
    // question text that merely starts with a capital letter ("A website...").
    const oM = line.match(/^([A-D])\s*[.)]\s+(.*)$/);
    if (oM && draft && target !== null) {
      const letter = oM[1].toUpperCase() as 'A';
      const idx = OPTION_LETTERS.indexOf(letter);
      draft.options[idx] = oM[2];
      target = letter;
      continue;
    }

    // Continuation of the current field (wrapped question / option text).
    if (draft && target === 'q') {
      draft.q += ' ' + line;
    } else if (draft && target && target !== 'q') {
      const idx = OPTION_LETTERS.indexOf(target);
      draft.options[idx] = `${draft.options[idx] ?? ''} ${line}`.trim();
    }
    // Otherwise it's a section heading / instructions — ignore.
  }
  commit();

  return result;
}

/** Parse an assessment PDF file into editable questions, in the browser. */
export async function parseAssessmentPdf(file: File): Promise<ParsedAssessment> {
  const lines = await extractLines(file);
  return parseLines(lines);
}

// ---------------------------------------------------------------------------
// Section-aware import — used by Interview (5 competency modules) and Screening
// (Must-have / Good-to-have). The PDF groups questions under headings; we route
// each question into the matching section so it lands in the right UI panel.
// ---------------------------------------------------------------------------

interface SectionQuestion {
  text: string;
  options: string[];
  answer: number | null;
}

interface SectionMatcher<K extends string> {
  key: K;
  re: RegExp;
}

/**
 * Decide whether a line is a section heading (e.g. "Technical", "Must-have
 * questions") rather than a question. Headings are short, don't end with "?",
 * and don't start with a question / option / answer marker.
 */
function matchSection<K extends string>(
  line: string,
  sections: SectionMatcher<K>[],
  maxWords: number,
): K | null {
  if (/^(?:Q\s*)?\d{1,3}\s*[.):\-]\s|^[A-D]\s*[.)]\s|^Answer\s*[:\-]|^[-•*▪]\s/i.test(line)) {
    return null;
  }
  if (line.endsWith('?') || line.length > 60) return null;
  if (line.split(/\s+/).length > maxWords) return null;
  for (const s of sections) if (s.re.test(line)) return s.key;
  return null;
}

const Q_START = /^(?:Q\s*)?(\d{1,3})\s*[.):\-]\s+(.*)$/i;
const BULLET = /^[-•*▪]\s+(.*)$/;
const OPTION = /^([A-D])\s*[.)]\s+(.*)$/;
const ANSWER = /^Answer\s*[:\-]?\s*([A-D])\b/i;
const TITLE = /^(?:Assessment|Interview|Screening)\s*[:\-]\s*(.+)$/i;

/**
 * Generic state machine that buckets a PDF's questions under the sections it
 * matches. Within a section, questions may be numbered ("Q1." / "1.") or simply
 * one-per-line (interview style); option lines (A–D) and an `Answer:` line are
 * captured when `withOptions` is set (screening / assessment).
 */
function parseSectioned<K extends string>(
  lines: string[],
  sections: SectionMatcher<K>[],
  opts: { withOptions: boolean; maxHeadingWords: number },
): { title?: string; groups: Record<K, SectionQuestion[]>; uncategorized: SectionQuestion[] } {
  const groups = Object.fromEntries(sections.map(s => [s.key, []])) as Record<K, SectionQuestion[]>;
  const uncategorized: SectionQuestion[] = [];
  let title: string | undefined;

  let currentKey: K | null = null;
  // 'numbered' = questions carry Q#/bullet markers (continuation lines append);
  // 'unnumbered' = each plain line is its own question (interview style).
  let mode: 'numbered' | 'unnumbered' | null = null;
  let draft: SectionQuestion | null = null;
  let target: 'q' | 'A' | 'B' | 'C' | 'D' | null = null;

  const bucket = () => (currentKey ? groups[currentKey] : uncategorized);
  const commit = () => {
    if (draft && draft.text.trim()) bucket().push(draft);
    draft = null;
    target = null;
  };
  const start = (text: string) => {
    commit();
    draft = { text, options: [], answer: null };
    target = 'q';
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    if (!title && !draft && currentKey === null) {
      const t = line.match(TITLE);
      if (t) {
        title = t[1].trim();
        continue;
      }
    }

    const sec = matchSection(line, sections, opts.maxHeadingWords);
    if (sec) {
      commit();
      currentKey = sec;
      mode = null;
      continue;
    }

    if (opts.withOptions) {
      const ans = line.match(ANSWER);
      if (ans && draft) {
        draft.answer = OPTION_LETTERS.indexOf(ans[1].toUpperCase() as 'A');
        target = null;
        continue;
      }
      const opt = line.match(OPTION);
      if (opt && draft && target !== null) {
        const letter = opt[1].toUpperCase() as 'A';
        draft.options[OPTION_LETTERS.indexOf(letter)] = opt[2];
        target = letter;
        continue;
      }
    }

    const qn = line.match(Q_START);
    const bl = line.match(BULLET);
    if (qn || bl) {
      mode = 'numbered';
      start((qn ? qn[2] : bl![1]) || '');
      continue;
    }

    // Plain text line.
    if (mode === null || mode === 'unnumbered') {
      mode = mode ?? 'unnumbered';
      start(line);
      continue;
    }
    // Numbered mode: wrapped continuation of the question or current option.
    if (draft && target === 'q') {
      draft.text += ' ' + line;
    } else if (draft && target && target !== 'q' && opts.withOptions) {
      const idx = OPTION_LETTERS.indexOf(target);
      draft.options[idx] = `${draft.options[idx] ?? ''} ${line}`.trim();
    }
  }
  commit();

  return { title, groups, uncategorized };
}

// ── Interview ──────────────────────────────────────────────────────────────

export interface InterviewImport {
  title?: string;
  byModule: Record<InterviewModule, string[]>;
  /** Total questions matched into a module. */
  total: number;
}

const INTERVIEW_SECTIONS: SectionMatcher<InterviewModule>[] = [
  { key: 'Problem Solving', re: /problem[-\s]?solv|problem|analytical/i },
  { key: 'Technical', re: /technical|technolog|coding|engineering/i },
  { key: 'Communication', re: /communicat/i },
  { key: 'Cultural', re: /cultur|values?\s*fit/i },
  { key: 'Interpersonal', re: /interpersonal|teamwork|collaborat/i },
];

/**
 * Parse an interview PDF into question text grouped by competency module.
 * Options/answers (if any) are dropped — interview questions are rated, not
 * multiple-choice. Questions before the first recognised heading are ignored.
 */
export async function parseInterviewPdf(file: File): Promise<InterviewImport> {
  const lines = await extractLines(file);
  const { title, groups } = parseSectioned(lines, INTERVIEW_SECTIONS, {
    withOptions: false,
    maxHeadingWords: 4,
  });
  const byModule = Object.fromEntries(
    INTERVIEW_MODULES.map(m => [m, groups[m].map(q => q.text.trim()).filter(Boolean)]),
  ) as Record<InterviewModule, string[]>;
  const total = INTERVIEW_MODULES.reduce((n, m) => n + byModule[m].length, 0);
  return { title, byModule, total };
}

// ── Screening (Must-have / Good-to-have) ─────────────────────────────────────

export type ScreeningBucketKey = 'mustHave' | 'goodToHave';

export interface ScreeningQuestion {
  text: string;
  options: string[];
}

export interface ScreeningImport {
  title?: string;
  mustHave: ScreeningQuestion[];
  goodToHave: ScreeningQuestion[];
  total: number;
}

const SCREENING_SECTIONS: SectionMatcher<ScreeningBucketKey>[] = [
  { key: 'goodToHave', re: /good[-\s]?to[-\s]?have|nice[-\s]?to[-\s]?have|preferred|optional|good/i },
  { key: 'mustHave', re: /must[-\s]?have|mandatory|required|essential|must/i },
];

/** Clamp parsed options to the screening editor's 2–4 range. */
function normalizeOptions(options: string[]): string[] {
  const cleaned = options
    .map(o => o.trim())
    .filter(Boolean)
    .slice(0, SCREENING_MAX_OPTIONS);
  while (cleaned.length < SCREENING_MIN_OPTIONS) cleaned.push('');
  return cleaned;
}

/**
 * Parse a screening PDF into Must-have / Good-to-have questions, each with its
 * options. The correct-answer marker (if present) is dropped — screening
 * questions are qualifiers, not graded MCQs.
 */
export async function parseScreeningPdf(file: File): Promise<ScreeningImport> {
  const lines = await extractLines(file);
  const { title, groups } = parseSectioned(lines, SCREENING_SECTIONS, {
    withOptions: true,
    maxHeadingWords: 4,
  });
  const map = (qs: SectionQuestion[]): ScreeningQuestion[] =>
    qs.filter(q => q.text.trim()).map(q => ({ text: q.text.trim(), options: normalizeOptions(q.options) }));
  const mustHave = map(groups.mustHave);
  const goodToHave = map(groups.goodToHave);
  return { title, mustHave, goodToHave, total: mustHave.length + goodToHave.length };
}
