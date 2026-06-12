'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from './Select';
import {
  loadScreeningBanks,
  type ScreeningBank,
  type ScreeningItem,
} from '@/lib/question-banks';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from './Toaster';
import { cn } from '@/lib/utils';
import {
  Job,
  JobStatus,
  ScreeningQuestion,
  QuestionCategory,
  QuestionImportance,
  QuestionType,
} from '../types';
import {
  Briefcase,
  Plus,
  X,
  Link2,
  Check,
  ExternalLink,
  Trash2,
  Users,
  MapPin,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ListChecks,
} from 'lucide-react';

let qSeq = 0;
const newQuestion = (importance: QuestionImportance): ScreeningQuestion => ({
  id: `Q${Date.now().toString(36)}${qSeq++}`,
  text: '',
  category: 'Field',
  importance,
  type: 'yesno',
  expectedAnswer: true,
});

// A reusable screening-set question (with 2+ options) becomes a choice question;
// otherwise it falls back to a short-text question. No expected option is set —
// these are informational on the public form (see buildAnswers).
const itemToQuestion = (it: ScreeningItem, importance: QuestionImportance): ScreeningQuestion => {
  const options = it.options.map(o => o.trim()).filter(Boolean);
  const hasChoices = options.length >= 2;
  return {
    id: `Q${Date.now().toString(36)}${qSeq++}`,
    text: it.text.trim(),
    category: 'Field',
    importance,
    type: hasChoices ? 'choice' : 'text',
    ...(hasChoices ? { options } : {}),
  };
};

/** Flatten a saved screening set into the job's screeningQuestions shape. */
const bankToQuestions = (bank: ScreeningBank): ScreeningQuestion[] => [
  ...bank.mustHave.filter(it => it.text.trim()).map(it => itemToQuestion(it, 'Must Have')),
  ...bank.goodToHave.filter(it => it.text.trim()).map(it => itemToQuestion(it, 'Good to Have')),
];

type SortKey = 'title' | 'exp' | 'salary' | 'status' | 'applicants';

interface JobListViewProps {
  jobs: Job[];
  applicantCounts: Record<string, number>;
  onCreateJob: (job: Job) => void;
  onSetStatus: (id: string, status: JobStatus) => void;
  onDeleteJob: (id: string) => void;
}

const EMPTY_FORM = {
  title: '',
  department: 'Engineering',
  location: 'Mumbai',
  employmentType: 'Full-time' as Job['employmentType'],
  workMode: 'Hybrid' as Job['workMode'],
  minExperienceYears: 3,
  salaryMin: '',
  salaryMax: '',
  description: '',
  requirements: '',
  screeningQuestions: [] as ScreeningQuestion[],
};

function statusBadge(status: JobStatus): string {
  switch (status) {
    case 'Open':
      return 'bg-emerald-50 text-emerald-600';
    case 'Closed':
      return 'bg-red-50 text-red-600';
    case 'On Hold':
      return 'bg-yellow-50 text-yellow-600';
    default:
      return 'bg-[#E6E1D8] text-gray-500';
  }
}

export function JobListView({
  jobs,
  applicantCounts,
  onCreateJob,
  onSetStatus,
  onDeleteJob,
}: JobListViewProps) {
  const toast = useToast();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Reusable Must-have/Good-to-have sets from the Question Library.
  const [screeningBanks, setScreeningBanks] = useState<ScreeningBank[]>([]);
  const [screeningSetId, setScreeningSetId] = useState('');

  // Refresh the available screening sets each time the create form opens.
  useEffect(() => {
    if (showAddForm) {
      setScreeningBanks(loadScreeningBanks());
      setScreeningSetId('');
    }
  }, [showAddForm]);

  // Apply a saved set: replace the form's screening questions with its questions.
  const applyScreeningSet = (id: string) => {
    setScreeningSetId(id);
    const bank = screeningBanks.find(b => b.id === id);
    setForm(f => ({ ...f, screeningQuestions: bank ? bankToQuestions(bank) : [] }));
  };
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'title',
    dir: 'asc',
  });

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const toNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, '')) || 0;
  // Auto-capitalise the first letter of the job title (stored & shown that way).
  const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const openApplicants = (id: string) => router.push(`/jobs/${id}/applicants`);

  const publicUrl = (id: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/jobs/${id}` : `/jobs/${id}`;

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API can be unavailable on insecure origins.
      toast.error('Could not copy the link — copy it from the address bar instead.');
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    // Every field is compulsory — block publishing until they're all filled.
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('Job title');
    if (!form.department) missing.push('Department');
    if (!form.location.trim()) missing.push('Location');
    if (!form.employmentType) missing.push('Employment type');
    if (!form.workMode) missing.push('Work mode');
    if (form.minExperienceYears === null || Number.isNaN(Number(form.minExperienceYears)))
      missing.push('Min experience');
    if (!form.description.trim()) missing.push('Job description');
    if (!form.requirements.trim()) missing.push('Requirements');

    if (missing.length > 0) {
      toast.error(`Please fill all fields before publishing: ${missing.join(', ')}.`);
      return;
    }

    const created: Job = {
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      title: capitalizeFirst(form.title.trim()),
      department: form.department,
      location: form.location,
      employmentType: form.employmentType,
      workMode: form.workMode,
      minExperienceYears: Number(form.minExperienceYears),
      salaryMin: form.salaryMin,
      salaryMax: form.salaryMax,
      description: form.description,
      requirements: form.requirements,
      screeningQuestions: form.screeningQuestions
        .map(q => ({ ...q, text: q.text.trim() }))
        .filter(q => q.text),
      status: 'Open',
      postedBy: 'HR Specialist',
      postedDate: new Date().toISOString().split('T')[0],
    };
    onCreateJob(created);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    toast.success(`"${created.title}" published — copy its public link from the card.`);
  };

  const addQuestion = (importance: QuestionImportance) =>
    setForm(f => ({ ...f, screeningQuestions: [...f.screeningQuestions, newQuestion(importance)] }));
  const updateQuestion = (id: string, patch: Partial<ScreeningQuestion>) =>
    setForm(f => ({
      ...f,
      screeningQuestions: f.screeningQuestions.map(q => (q.id === id ? { ...q, ...patch } : q)),
    }));
  const removeQuestion = (id: string) =>
    setForm(f => ({ ...f, screeningQuestions: f.screeningQuestions.filter(q => q.id !== id) }));

  // One question editor row (importance is set by the group it lives in).
  const renderQuestion = (q: ScreeningQuestion, idx: number) => (
    <div key={q.id} className="space-y-2.5 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2.5 font-mono text-[11px] text-muted-foreground">{idx + 1}.</span>
        <Input
          value={q.text}
          onChange={e => updateQuestion(q.id, { text: e.target.value })}
          placeholder="e.g. Do you have 3+ years of React experience?"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => removeQuestion(q.id)}
          aria-label="Remove question"
          className="mt-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 pl-5 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Category</span>
          <Select
            value={q.category}
            onChange={e => updateQuestion(q.id, { category: e.target.value as QuestionCategory })}
            className="mt-1 h-8 w-full rounded-md border border-input bg-secondary/50 px-2 text-xs"
          >
            <option value="Field">Field / skills</option>
            <option value="Cultural Fit">Cultural fit</option>
          </Select>
        </label>
        <label className="block">
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Answer type</span>
          <Select
            value={q.type ?? 'yesno'}
            onChange={e => {
              const type = e.target.value as QuestionType;
              const patch: Partial<ScreeningQuestion> = { type };
              if (type === 'choice' && !(q.options && q.options.length)) patch.options = ['', ''];
              updateQuestion(q.id, patch);
            }}
            className="mt-1 h-8 w-full rounded-md border border-input bg-secondary/50 px-2 text-xs"
          >
            <option value="yesno">Yes / No</option>
            <option value="choice">Multiple choice</option>
            <option value="text">Short text</option>
          </Select>
        </label>
      </div>

      {/* per-type answer config */}
      <div className="pl-5">
        {(q.type ?? 'yesno') === 'yesno' && (
          <label className="block max-w-[10rem]">
            <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Passing answer</span>
            <Select
              value={q.expectedAnswer ? 'yes' : 'no'}
              onChange={e => updateQuestion(q.id, { expectedAnswer: e.target.value === 'yes' })}
              className="mt-1 h-8 w-full rounded-md border border-input bg-secondary/50 px-2 text-xs"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </label>
        )}

        {q.type === 'choice' && (
          <div className="space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Options</span>
            {(q.options ?? []).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={e =>
                    updateQuestion(q.id, {
                      options: (q.options ?? []).map((o, j) => (j === oi ? e.target.value : o)),
                      expectedOption: q.expectedOption === opt ? e.target.value : q.expectedOption,
                    })
                  }
                  placeholder={`Option ${oi + 1}`}
                  className="h-8 flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(q.id, { options: (q.options ?? []).filter((_, j) => j !== oi) })
                  }
                  aria-label="Remove option"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateQuestion(q.id, { options: [...(q.options ?? []), ''] })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-700"
            >
              <Plus size={12} /> Add option
            </button>
            <label className="block pt-1">
              <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">Passing option</span>
              <Select
                value={q.expectedOption ?? ''}
                onChange={e => updateQuestion(q.id, { expectedOption: e.target.value })}
                className="mt-1 h-8 w-full rounded-md border border-input bg-secondary/50 px-2 text-xs"
              >
                <option value="">— select the correct option —</option>
                {(q.options ?? []).filter(Boolean).map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        )}

        {q.type === 'text' && (
          <p className="text-[11px] text-muted-foreground">
            Open text — the candidate types a short answer that HR reviews (not auto-scored).
          </p>
        )}
      </div>
    </div>
  );

  const openCount = jobs.filter(j => j.status === 'Open').length;
  const closedCount = jobs.filter(j => j.status === 'Closed' || j.status === 'On Hold').length;
  const totalApplicants = Object.values(applicantCounts).reduce((a, b) => a + b, 0);

  const q = search.trim().toLowerCase();
  const visibleJobs = q
    ? jobs.filter(
        j =>
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.id.toLowerCase().includes(q),
      )
    : jobs;

  const sortedJobs = [...visibleJobs].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    switch (sort.key) {
      case 'exp':
        return (a.minExperienceYears - b.minExperienceYears) * dir;
      case 'salary':
        return (toNum(a.salaryMin) - toNum(b.salaryMin)) * dir;
      case 'status':
        return a.status.localeCompare(b.status) * dir;
      case 'applicants':
        return ((applicantCounts[a.id] ?? 0) - (applicantCounts[b.id] ?? 0)) * dir;
      default:
        return a.title.localeCompare(b.title) * dir;
    }
  });

  // Sortable column header.
  const SortTh = ({
    k,
    label,
    className,
  }: {
    k: SortKey;
    label: string;
    className?: string;
  }) => (
    <th scope="col" className={cn('px-4 py-2.5 font-semibold', className)}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-gray-800"
      >
        {label}
        {sort.key === k ? (
          sort.dir === 'asc' ? (
            <ChevronUp size={11} className="text-accent-600" />
          ) : (
            <ChevronDown size={11} className="text-accent-600" />
          )
        ) : (
          <ChevronsUpDown size={11} className="text-gray-400" />
        )}
      </button>
    </th>
  );

  const stats = [
    { label: 'Total openings', value: jobs.length, dot: 'bg-accent-500' },
    { label: 'Live & open', value: openCount, dot: 'bg-emerald-500' },
    { label: 'Closed / hold', value: closedCount, dot: 'bg-gray-400' },
    { label: 'Applicants', value: totalApplicants, dot: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-5 text-xs select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center shrink-0">
            <Briefcase size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight font-display">
              Job Postings
            </h2>
            <p className="text-gray-500 text-[11px] max-w-md">
              Publish a role, share its public link, and collect applications straight into your
              candidate pipeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs…"
              className="w-44 sm:w-56 pl-8 pr-3 py-2 text-xs bg-[#F7F4EE] border border-[#DAD4C8] rounded-lg focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition"
            />
          </div>
          <button
            id="btn-post-job"
            onClick={() => setShowAddForm(true)}
            className="bg-accent-600 hover:bg-accent-700 text-white px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition font-medium shrink-0 shadow-2xs"
          >
            <Plus size={15} /> Post New Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-xl px-4 py-3 shadow-2xs"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Job cards grid */}
      {jobs.length === 0 ? (
        <div className="bg-[#F7F4EE] border border-dashed border-[#CFC8BA] rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6">
          <span className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-500 flex items-center justify-center">
            <Briefcase size={26} />
          </span>
          <p className="font-bold text-gray-700 text-sm">No job postings yet</p>
          <p className="text-[11px] text-gray-500 max-w-xs">
            Post your first opening to generate a shareable public apply link.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-1 bg-accent-600 hover:bg-accent-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition font-medium"
          >
            <Plus size={14} /> Post New Job
          </button>
        </div>
      ) : (
        <div className="bg-[#F7F4EE] border border-[#DAD4C8] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#ECE8E0] border-b border-[#DAD4C8] text-[10px] font-mono uppercase tracking-wider text-gray-500">
                  <SortTh k="title" label="Role" />
                  <th scope="col" className="font-semibold px-4 py-2.5">Location</th>
                  <th scope="col" className="font-semibold px-4 py-2.5">Type</th>
                  <SortTh k="exp" label="Exp." className="text-center" />
                  <SortTh k="salary" label="CTC" />
                  <SortTh k="status" label="Status" />
                  <SortTh k="applicants" label="Applicants" className="text-center" />
                  <th scope="col" className="font-semibold px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8]">
                {sortedJobs.map(job => {
                  const count = applicantCounts[job.id] ?? 0;
                  return (
                    <tr
                      key={job.id}
                      onClick={() => openApplicants(job.id)}
                      className="hover:bg-[#ECE8E0] transition cursor-pointer align-middle"
                      title="View applicants for this role"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 text-[13px]">{job.title}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {job.id} · {job.department}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-gray-500 shrink-0" /> {job.location}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 whitespace-nowrap">
                        {job.employmentType}
                        <span className="text-gray-400"> · {job.workMode}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 font-mono text-center whitespace-nowrap">
                        {job.minExperienceYears}+ yrs
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-accent-700 font-semibold whitespace-nowrap">
                        {job.salaryMin} – {job.salaryMax}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${statusBadge(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openApplicants(job.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 hover:text-accent-700 cursor-pointer transition"
                          title="View applicants for this role"
                        >
                          <Users size={12} className="text-accent-600" />
                          {count}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={e => {
                              e.stopPropagation();
                              copyLink(job.id);
                            }}
                            className="font-mono font-semibold"
                            title="Copy public application link"
                          >
                            {copiedId === job.id ? (
                              <>
                                <Check size={11} className="text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Link2 size={11} /> Link
                              </>
                            )}
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="xs"
                            className="font-mono font-semibold"
                            title="Open public posting"
                          >
                            <a
                              href={publicUrl(job.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={11} /> View
                            </a>
                          </Button>
                          <Tip label={job.status === 'Open' ? 'Active — click to pause' : 'Paused — click to activate'}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={job.status === 'Open'}
                              aria-label={job.status === 'Open' ? 'Pause this posting' : 'Activate this posting'}
                              onClick={e => {
                                e.stopPropagation();
                                onSetStatus(job.id, job.status === 'Open' ? 'Closed' : 'Open');
                              }}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                                job.status === 'Open' ? 'bg-accent-600' : 'bg-[#CFC8BA]'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  job.status === 'Open' ? 'translate-x-[18px]' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </Tip>
                          <Tip label="Delete posting">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={e => {
                                e.stopPropagation();
                                toast.confirm({
                                  title: `Delete "${job.title}"?`,
                                  description: 'This cannot be undone.',
                                  confirmLabel: 'Delete',
                                  onConfirm: () => onDeleteJob(job.id),
                                });
                              }}
                              className="text-gray-500 hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete posting"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </Tip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create job modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,72rem)] max-w-[72rem] sm:max-w-[72rem] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="font-mono text-xs font-bold uppercase tracking-wider text-gray-900">
              Publish a New Job Opening
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
              {/* Role */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Role</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Title, team and location.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="job-title" className="text-sm font-medium">
                        Job title <span className="text-accent-600">*</span>
                      </Label>
                      <Input
                        id="job-title"
                        placeholder="e.g. Senior React Engineer"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: capitalizeFirst(e.target.value) })}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Department</Label>
                      <Select
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="mt-2 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm shadow-xs"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Design">Design</option>
                        <option value="Sales">Sales</option>
                        <option value="Human Resources">Human Resources</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="job-location" className="text-sm font-medium">
                        Location
                      </Label>
                      <Input
                        id="job-location"
                        value="Mumbai"
                        readOnly
                        disabled
                        className="mt-2"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        All roles are based at the Mumbai office.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Details */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Details</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Employment terms and compensation.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium">Employment type</Label>
                      <Select
                        value={form.employmentType}
                        onChange={e =>
                          setForm({ ...form, employmentType: e.target.value as Job['employmentType'] })
                        }
                        className="mt-2 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm shadow-xs"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Temporary">Temporary</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Work mode</Label>
                      <Select
                        value={form.workMode}
                        onChange={e => setForm({ ...form, workMode: e.target.value as Job['workMode'] })}
                        className="mt-2 h-9 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm shadow-xs"
                      >
                        <option value="Onsite">Onsite</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="job-exp" className="text-sm font-medium">
                        Min exp. (yrs) <span className="text-accent-600">*</span>
                      </Label>
                      <Input
                        id="job-exp"
                        type="number"
                        min={0}
                        value={form.minExperienceYears}
                        onChange={e =>
                          setForm({ ...form, minExperienceYears: Number(e.target.value) })
                        }
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="job-smin" className="text-sm font-medium">
                        CTC — min
                      </Label>
                      <Input
                        id="job-smin"
                        placeholder="e.g. 12 LPA"
                        value={form.salaryMin}
                        onChange={e => setForm({ ...form, salaryMin: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="job-smax" className="text-sm font-medium">
                        CTC — max
                      </Label>
                      <Input
                        id="job-smax"
                        placeholder="e.g. 18 LPA"
                        value={form.salaryMax}
                        onChange={e => setForm({ ...form, salaryMax: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Job description */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Job Description</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    The full JD — role overview, responsibilities, and what success looks like.
                  </p>
                </div>
                <div className="space-y-4 md:col-span-2">
                  <div>
                    <Label htmlFor="job-desc" className="text-sm font-medium">
                      Job description (JD) <span className="text-accent-600">*</span>
                    </Label>
                    <Textarea
                      id="job-desc"
                      placeholder="Paste or write the full job description — about the role, responsibilities, team, impact, and who you're looking for…"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value.slice(0, 2000) })}
                      rows={10}
                      maxLength={2000}
                      className="mt-2"
                      required
                    />
                    <p className="mt-1 text-right text-[11px] font-mono text-muted-foreground">
                      {form.description.length}/2000
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="job-req" className="text-sm font-medium">
                      Requirements (one per line) <span className="text-accent-600">*</span>
                    </Label>
                    <Textarea
                      id="job-req"
                      placeholder={'5+ years React experience\nStrong system design skills\n…'}
                      value={form.requirements}
                      onChange={e => setForm({ ...form, requirements: e.target.value })}
                      rows={3}
                      className="mt-2"
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Screening questions */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h2 className="font-semibold text-foreground">Screening questions</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Add as many <span className="font-medium">must-have</span> and{' '}
                    <span className="font-medium">good-to-have</span> questions as you like. Each
                    candidate is auto-rated <span className="font-medium">Fit / Borderline / Unfit</span>{' '}
                    — a failed must-have means Unfit.
                  </p>
                </div>
                <div className="space-y-5 md:col-span-2">
                  {/* Reuse a saved Must-have/Good-to-have set from the Question Library */}
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <label className="text-xs font-semibold text-foreground">
                      Reuse a saved screening set
                    </label>
                    <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">
                      Pick a role&apos;s set from the Question Library to attach its questions — you
                      can still edit them below.
                    </p>
                    {screeningBanks.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        No screening sets yet — create one in Question Library → Must-have &amp;
                        Good-to-have.
                      </p>
                    ) : (
                      <Select
                        value={screeningSetId}
                        onChange={e => applyScreeningSet(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-secondary/50 px-2 text-xs"
                        placeholder="Select a screening set"
                      >
                        <option value="">— None (add manually) —</option>
                        {screeningBanks.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.roleName} ({b.mustHave.length} must-have · {b.goodToHave.length}{' '}
                            good-to-have)
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>

                  {(
                    [
                      { key: 'Must Have', label: 'Must-have' },
                      { key: 'Good to Have', label: 'Good to have' },
                    ] as const
                  ).map(group => {
                    const items = form.screeningQuestions.filter(q => q.importance === group.key);
                    return (
                      <div key={group.key} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                            {group.label} questions
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addQuestion(group.key)}
                          >
                            <Plus size={14} /> Add
                          </Button>
                        </div>
                        {items.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-3 text-center text-xs text-muted-foreground">
                            No {group.label.toLowerCase()} questions yet.
                          </p>
                        ) : (
                          items.map((q, idx) => renderQuestion(q, idx))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Publish Job &amp; Get Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default JobListView;
