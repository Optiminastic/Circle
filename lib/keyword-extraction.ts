/**
 * Local, free heuristic keyword suggester for the job form's "Auto-detect
 * from JD" button — no API call, runs entirely in the browser. It's a
 * starting point HR reviews and edits, never authoritative on its own (see
 * JobListView.tsx's Keywords chip picker).
 */

// Common filler/generic words that appear in almost every JD regardless of
// role and never make a useful keyword on their own.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'in', 'on', 'at', 'to',
  'for', 'with', 'from', 'by', 'as', 'is', 'are', 'be', 'been', 'being',
  'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'you', 'your', 'we', 'our', 'us',
  'experience', 'experienced', 'years', 'year', 'strong', 'excellent',
  'good', 'great', 'solid', 'proven', 'knowledge', 'familiarity',
  'familiar', 'proficiency', 'proficient', 'ability', 'skills', 'skill',
  'candidate', 'candidates', 'applicant', 'team', 'teams', 'role', 'roles',
  'work', 'working', 'works', 'job', 'company', 'organization', 'position',
  'responsibilities', 'responsible', 'requirements', 'required', 'require',
  'preferred', 'plus', 'nice', 'have', 'has', 'having', 'including',
  'etc', 'such', 'other', 'related', 'various', 'multiple', 'across',
  'high', 'level', 'levels', 'looking', 'seeking', 'ideal', 'about',
  'understanding', 'communication', 'environment', 'opportunity', 'new',
  'minimum', 'highly', 'optiminastic', 'prepare', 'key', 'willingness',
  'prior', 'stay', 'follow', 'operate', 'fast', 'basic', 'genuine',
  'master', 'exposure', 'haves', 'confidence', 'draft', 'identify',
  'negotiate', 'track', 'participate', 'engage', 'release', 'integrate',
  'fix', 'comfortable', 'passion', 'interest', 'eagerness', 'am', 'pm',
  // Generic sentence-starter verbs that open almost every JD bullet line —
  // capitalized (start-of-line) but never a real skill/tool name.
  'design', 'build', 'implement', 'manage', 'own', 'lead', 'drive',
  'create', 'develop', 'support', 'ensure', 'maintain', 'coordinate',
  'deliver', 'optimize', 'collaborate', 'partner', 'define', 'plan',
  'execute', 'monitor', 'review', 'improve', 'contribute', 'help',
  'assist', 'perform', 'conduct', 'handle', 'take', 'act',
]);

// A token looks like a real term (not just a capitalized sentence-starter)
// if it's capitalized mid-phrase, or contains digits/./+/# (Node.js, C++,
// 3D, ES6) — those punctuation marks are otherwise stripped by tokenizing.
const TECHY = /[\d.+#]/;

function tokenize(text: string): string[] {
  // Keep letters/digits and ./+/# so "Node.js"/"C++"/"C#" survive as one token.
  return (text.match(/[A-Za-z][A-Za-z0-9.+#]*/g) ?? [])
    // A trailing "." is a sentence-ending period, not part of the term
    // (internal dots like "Node.js" are unaffected — only strips at the end).
    .map(t => t.replace(/\.+$/, ''))
    .filter(t => t.length > 1);
}

/**
 * Suggest up to `limit` keyword candidates from a job's free-text fields.
 * `requirements` is weighted highest since it's already one skill/line;
 * `description`/`keyResponsibilities` are secondary signal.
 */
export function suggestKeywords(
  fields: { requirements?: string; description?: string; keyResponsibilities?: string },
  limit = 15,
): string[] {
  const weight = new Map<string, number>();

  const addFrom = (text: string | undefined, boost: number) => {
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      const tokens = tokenize(line);
      for (const raw of tokens) {
        const lower = raw.toLowerCase();
        if (STOPWORDS.has(lower)) continue;
        const looksMeaningful = /[A-Z]/.test(raw.slice(1)) || TECHY.test(raw) || raw[0] === raw[0].toUpperCase();
        if (!looksMeaningful) continue;
        // Store the first-seen casing (e.g. "React" not "react").
        const key = raw;
        weight.set(key, (weight.get(key) ?? 0) + boost);
      }
      // Short requirement lines (<= 4 words) often already ARE a single
      // skill/tool name on their own — weight the whole line too, e.g. a
      // "Blender" or "Unreal Engine" line with no other recognizable token.
      const words = line.trim().split(/\s+/).filter(Boolean);
      if (boost > 1 && words.length > 0 && words.length <= 4) {
        const phrase = words.join(' ').replace(/[.,;:]+$/, '');
        if (phrase && !STOPWORDS.has(phrase.toLowerCase())) {
          weight.set(phrase, (weight.get(phrase) ?? 0) + boost);
        }
      }
    }
  };

  addFrom(fields.requirements, 3);
  addFrom(fields.keyResponsibilities, 2);
  addFrom(fields.description, 1);

  return Array.from(weight.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, limit);
}
