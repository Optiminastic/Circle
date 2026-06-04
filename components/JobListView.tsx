'use client';

import React, { useState } from 'react';
import { Select } from './Select';
import { useToast } from './Toaster';
import { Job, JobStatus } from '../types';
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
  Lock,
  Unlock,
} from 'lucide-react';

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
  location: 'Remote',
  employmentType: 'Full-time' as Job['employmentType'],
  workMode: 'Hybrid' as Job['workMode'],
  minExperienceYears: 3,
  salaryMin: '$120,000',
  salaryMax: '$160,000',
  description:
    'We are looking for a driven professional to join our team. In this role you will own end-to-end delivery, collaborate cross-functionally, and help shape the product.',
  requirements:
    'Strong fundamentals in the core stack\nExcellent communication skills\nProven track record of shipping quality work',
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
      return 'bg-gray-100 text-gray-500';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const publicUrl = (id: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/jobs/${id}` : `/jobs/${id}`;

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(id));
    } catch {
      // Clipboard API can be unavailable on insecure origins — fall back to prompt.
      window.prompt('Copy the public application link:', publicUrl(id));
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('A job title is required to publish the posting.');
      return;
    }
    const created: Job = {
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      title: form.title.trim(),
      department: form.department,
      location: form.location,
      employmentType: form.employmentType,
      workMode: form.workMode,
      minExperienceYears: Number(form.minExperienceYears),
      salaryMin: form.salaryMin,
      salaryMax: form.salaryMax,
      description: form.description,
      requirements: form.requirements,
      status: 'Open',
      postedBy: 'HR Specialist',
      postedDate: new Date().toISOString().split('T')[0],
    };
    onCreateJob(created);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    toast.success(`"${created.title}" published — copy its public link from the card.`);
  };

  const openCount = jobs.filter(j => j.status === 'Open').length;
  const closedCount = jobs.filter(j => j.status === 'Closed' || j.status === 'On Hold').length;
  const totalApplicants = Object.values(applicantCounts).reduce((a, b) => a + b, 0);

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
            <p className="text-gray-400 text-[11px] max-w-md">
              Publish a role, share its public link, and collect applications straight into your
              candidate pipeline.
            </p>
          </div>
        </div>
        <button
          id="btn-post-job"
          onClick={() => setShowAddForm(true)}
          className="bg-accent-600 hover:bg-accent-700 text-white px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition font-medium shrink-0 shadow-2xs"
        >
          <Plus size={15} /> Post New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-white border border-[#E1D6BC] rounded-xl px-4 py-3 shadow-2xs"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Job cards grid */}
      {jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CDBE9C] rounded-2xl py-16 flex flex-col items-center gap-3 text-center px-6">
          <span className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-500 flex items-center justify-center">
            <Briefcase size={26} />
          </span>
          <p className="font-bold text-gray-700 text-sm">No job postings yet</p>
          <p className="text-[11px] text-gray-400 max-w-xs">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {jobs.map(job => {
            const count = applicantCounts[job.id] ?? 0;
            return (
              <div
                key={job.id}
                className="bg-white border border-[#E1D6BC] rounded-2xl p-4 shadow-2xs flex flex-col gap-3 hover:border-accent-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-[13px] truncate">{job.title}</h3>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {job.id} · {job.department}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 ${statusBadge(job.status)}`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 font-mono">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-gray-400" /> {job.location}
                  </span>
                  <span>{job.employmentType}</span>
                  <span>{job.workMode}</span>
                  <span>{job.minExperienceYears}+ yrs</span>
                </div>

                <div className="text-[11px] text-gray-600">
                  <span className="font-mono text-accent-700 font-semibold">
                    {job.salaryMin} – {job.salaryMax}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 line-clamp-2">{job.description}</p>

                <div className="flex items-center justify-between border-t border-[#EAE1CC] pt-2.5 mt-auto">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                    <Users size={12} className="text-accent-600" />
                    {count} applicant{count === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyLink(job.id)}
                      className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] text-gray-700 hover:text-accent-600 hover:border-accent-300 px-2 py-1 rounded-md font-semibold font-mono flex items-center gap-1 cursor-pointer transition shadow-2xs"
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
                    </button>
                    <a
                      href={publicUrl(job.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-[#FFFFFF] border border-[#E1D6BC] text-gray-700 hover:text-accent-600 hover:border-accent-300 px-2 py-1 rounded-md font-semibold font-mono flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Open public posting"
                    >
                      <ExternalLink size={11} /> View
                    </a>
                    <button
                      onClick={() =>
                        onSetStatus(job.id, job.status === 'Open' ? 'Closed' : 'Open')
                      }
                      className="text-[10px] text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-100 cursor-pointer"
                      title={job.status === 'Open' ? 'Close this posting' : 'Reopen this posting'}
                    >
                      {job.status === 'Open' ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete the "${job.title}" posting? This cannot be undone.`)) {
                          onDeleteJob(job.id);
                        }
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                      title="Delete posting"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create job modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs flex items-center justify-center z-[110] transition-opacity duration-300">
          <form
            onSubmit={handleCreate}
            className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E1D6BC] shadow-2xl w-full max-w-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-900 text-xs font-mono uppercase tracking-wider">
                Publish a New Job Opening
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Senior React Engineer"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Department</label>
                <Select
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Sales">Sales</option>
                  <option value="Human Resources">Human Resources</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA / Remote"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Employment Type</label>
                <Select
                  value={form.employmentType}
                  onChange={e =>
                    setForm({ ...form, employmentType: e.target.value as Job['employmentType'] })
                  }
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Temporary">Temporary</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Work Mode</label>
                <Select
                  value={form.workMode}
                  onChange={e => setForm({ ...form, workMode: e.target.value as Job['workMode'] })}
                  className="w-full px-2 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC]"
                >
                  <option value="Onsite">Onsite</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Min Experience (yrs)</label>
                <input
                  type="number"
                  min={0}
                  value={form.minExperienceYears}
                  onChange={e =>
                    setForm({ ...form, minExperienceYears: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Salary — Min</label>
                <input
                  type="text"
                  placeholder="$120,000"
                  value={form.salaryMin}
                  onChange={e => setForm({ ...form, salaryMin: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Salary — Max</label>
                <input
                  type="text"
                  placeholder="$160,000"
                  value={form.salaryMax}
                  onChange={e => setForm({ ...form, salaryMax: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Detailed Description</label>
              <textarea
                placeholder="Describe the role, responsibilities, team and impact..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Requirements (one per line)</label>
              <textarea
                placeholder="5+ years React experience&#10;Strong system design skills&#10;..."
                value={form.requirements}
                onChange={e => setForm({ ...form, requirements: e.target.value })}
                rows={3}
                className="w-full px-2.5 py-1.5 border border-[#E1D6BC] rounded text-xs bg-[#EAE1CC] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 border border-[#E1D6BC] hover:bg-gray-100 rounded text-gray-650 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded cursor-pointer font-semibold"
              >
                Publish Job & Get Link
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default JobListView;
