'use client';

/**
 * Settings → Interview Kit tab.
 *
 * Lets HR send a physical-interview question kit to any interviewer for any
 * candidate, independent of that candidate's interview pipeline. Reuses the
 * "send to interviewer" machinery from the candidate page: it saves an interview
 * sheet (linked to a kit-send record, not an interview), emails the interviewer
 * the sheet link, and records the send in history. When the interviewer submits
 * their answers, the backend writes them back onto the kit-send record and they
 * surface on the candidate's Physical Interview step.
 */

import React, { useMemo, useState } from 'react';
import { Send, Mail, ClipboardList, ExternalLink, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select } from './Select';
import { useToast } from './Toaster';
import { useCandidates } from '@/features/candidates/hooks';
import { useEmployees } from '@/features/employees/hooks';
import { useInterviewBanks, useInterviewKitSends } from '@/features/question-banks/hooks';
import { INTERVIEW_MODULES } from '@/lib/question-banks';
import { saveInterviewSheet } from '@/lib/interview-sheet';
import { sendCustomEmail } from '@/lib/api/notifications';
import { fetchRenderedTemplate } from '@/features/email-templates/hooks';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { randomId, nowISO } from '@/lib/utils';
import { usePagination } from '@/lib/use-pagination';
import { Pagination } from '@/components/ui/pagination';
import { useHrIdentity } from '@/features/employees/hooks';

const FIELD =
  'mt-1 h-9 w-full rounded-md border border-[#E4E6EA] bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500';

const fmt = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function SendInterviewKitTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const hr = useHrIdentity();
  const { data: candidates = [] } = useCandidates();
  const { data: employees = [] } = useEmployees();
  const { data: banks = [] } = useInterviewBanks();
  const { data: history = [] } = useInterviewKitSends();

  // Interviewers are picked from active employees; selecting one fills the email.
  const interviewerPool = useMemo(
    () => employees.filter(e => e.status !== 'Offboarded' && e.email),
    [employees],
  );

  const [email, setEmail] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [bankId, setBankId] = useState('');
  const [sending, setSending] = useState(false);

  const candidate = useMemo(() => candidates.find(c => c.id === candidateId), [candidates, candidateId]);
  const bank = useMemo(() => banks.find(b => b.id === bankId), [banks, bankId]);
  const bankCount = (b: (typeof banks)[number]) =>
    INTERVIEW_MODULES.reduce((n, m) => n + (b.modules[m]?.length ?? 0), 0);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? '')),
    [history],
  );
  const pg = usePagination(sortedHistory.length);

  // Once an interviewer has submitted a kit's answers (status 'Completed'), that
  // candidate is done — hide them from the picker so a finished kit isn't re-sent.
  const doneCandidateIds = useMemo(
    () => new Set(history.filter(h => h.status === 'Completed').map(h => h.candidateId)),
    [history],
  );
  const selectableCandidates = useMemo(
    () => candidates.filter(c => !doneCandidateIds.has(c.id)),
    [candidates, doneCandidateIds],
  );

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSend =
    emailValid && !!candidate && !doneCandidateIds.has(candidateId) && !!bank && !sending;

  const send = async () => {
    if (!canSend || !candidate || !bank) return;
    setSending(true);
    try {
      const role = candidate.appliedRole || candidate.department || 'the role';
      // Same flattening the candidate-page ivpack flow uses.
      const questions = INTERVIEW_MODULES.flatMap(m =>
        (bank.modules[m] ?? [])
          .filter(it => it.text.trim())
          .map(it => ({ text: it.text.trim(), options: [] as string[], module: m })),
      );
      if (questions.length === 0) {
        toast.error('This interview kit has no questions.');
        setSending(false);
        return;
      }

      const kitSendId = randomId('IKS');
      // Sheet links to the kit-send record (NOT an interview) — the feedback
      // write-back targets the kit record so the pipeline is untouched.
      const token = await saveInterviewSheet({
        kitSendId,
        candidateName: candidate.fullName,
        role,
        department: candidate.department,
        experienceYears: candidate.totalExperienceYears,
        relevantExperienceYears: candidate.relevantExperienceYears,
        email: candidate.email,
        phone: candidate.phone,
        currentCompany: candidate.currentCompany,
        currentDesignation: candidate.currentDesignation,
        interviewerName: email.trim(),
        mode: 'Offline',
        roleLabel: bank.roleName,
        questions,
      });
      const sheetUrl = `${window.location.origin}/interview-sheet?id=${token}`;

      // Compose from the interviewer-pack template; fall back to a short default.
      let subject = `Interview kit: ${candidate.fullName} — ${role}`;
      let body = `Hi there,\n\nPlease review and rate the interview questions for ${candidate.fullName} (${role}). The questions are linked below.\n\nBest regards,\n${hr.signoff}`;
      try {
        const tpl = await fetchRenderedTemplate('physical_interview_interviewer', {
          interviewer_name: 'there',
          candidate_name: candidate.fullName,
          role,
          department: candidate.department,
          experience: `${candidate.totalExperienceYears} yrs total`,
          hr_signoff: hr.signoff,
        });
        if (tpl) {
          subject = tpl.subject;
          body = tpl.body;
        }
      } catch {
        /* keep the default */
      }

      const res = await sendCustomEmail({
        to: email.trim(),
        subject,
        body,
        links: [{ label: 'Open interview questions', url: sheetUrl }],
      });
      if (!res.sent) {
        toast.error('Could not email the interviewer — try again.');
        setSending(false);
        return;
      }

      await repositories.interviewKitSends.create({
        id: kitSendId,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        interviewerEmail: email.trim(),
        bankId: bank.id,
        roleName: bank.roleName,
        questionCount: questions.length,
        questions: questions.map(q => ({ text: q.text, module: q.module })),
        sheetToken: token,
        sheetUrl,
        sentAt: nowISO(),
      });
      qc.invalidateQueries({ queryKey: qk.interviewKitSends.all });
      toast.success(`Interview kit sent to ${email.trim()}.`);
      setEmail('');
      setCandidateId('');
      setBankId('');
    } catch {
      toast.error('Something went wrong sending the interview kit.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send form */}
      <div className="space-y-4 rounded-xl border border-[#E4E6EA] bg-white p-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-accent-600" />
          <h3 className="text-sm font-bold text-gray-900">Send interview kit</h3>
        </div>
        <p className="text-[11px] text-gray-500">
          Send a physical-interview question set to an interviewer. Their answers appear on the
          candidate's Physical Interview step — the candidate's pipeline stage is not changed.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-600">Interviewer (employee)</label>
            <Select
              value=""
              onChange={e => {
                const emp = interviewerPool.find(x => x.id === e.target.value);
                if (emp?.email) setEmail(emp.email);
              }}
              className={FIELD}
            >
              <option value="">Pick an employee…</option>
              {interviewerPool.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} — {emp.role}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600">To (interviewer email)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="interviewer@example.com"
              className={FIELD}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600">Candidate</label>
            <Select value={candidateId} onChange={e => setCandidateId(e.target.value)} className={FIELD}>
              <option value="">Select a candidate…</option>
              {selectableCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.fullName} — {c.appliedRole || c.department}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600">Interview kit</label>
            <Select value={bankId} onChange={e => setBankId(e.target.value)} className={FIELD}>
              <option value="">Select a kit…</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.roleName} ({bankCount(b)} question{bankCount(b) === 1 ? '' : 's'})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={send} disabled={!canSend}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send interview kit'}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Sent history</h3>
          <span className="rounded-full bg-[#F1F3F5] px-2 py-0.5 font-mono text-[10px] font-semibold text-gray-500">
            {sortedHistory.length}
          </span>
        </div>
        {sortedHistory.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E4E6EA] bg-[#F7F8FA] px-3 py-4 text-center text-[12px] text-gray-500">
            No interview kits sent from Settings yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E4E6EA]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#F7F8FA] text-[10px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Candidate</th>
                  <th className="px-3 py-2 font-semibold">Interviewer</th>
                  <th className="px-3 py-2 font-semibold">Kit</th>
                  <th className="px-3 py-2 font-semibold">Qs</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Sent</th>
                  <th className="px-3 py-2 font-semibold">Sheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEDF0]">
                {sortedHistory.slice(pg.start, pg.end).map(h => (
                  <tr key={h.id} className="text-gray-700">
                    <td className="px-3 py-2 font-medium text-gray-900">{h.candidateName}</td>
                    <td className="px-3 py-2">{h.interviewerEmail}</td>
                    <td className="px-3 py-2">{h.roleName}</td>
                    <td className="px-3 py-2">{h.questionCount}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          h.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-[#F1F3F5] text-gray-500'
                        }`}
                      >
                        {h.status === 'Completed' ? 'Answered' : 'Awaiting'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-gray-400">{fmt(h.sentAt)}</td>
                    <td className="px-3 py-2">
                      <a
                        href={h.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-accent-600 hover:underline"
                      >
                        Open <ExternalLink size={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              totalItems={sortedHistory.length}
              pageSize={pg.pageSize}
              page={pg.page}
              onPageChange={pg.setPage}
              onPageSizeChange={pg.setPageSize}
              itemLabel="sends"
            />
          </div>
        )}
      </div>
    </div>
  );
}
