'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RoleQuestionBank,
  InterviewBank,
  ScreeningBank,
  IqBank,
  IQ_BANK_ID,
} from '@/lib/question-banks';
import type { TestQuestion } from '@/data/test-banks';
import { repositories } from '@/lib/api/repositories';
import { qk } from '@/lib/query/keys';
import { listOps } from '@/lib/query/optimistic';
import { optimisticOptions } from '@/lib/query/mutations';

/**
 * Question-bank persistence — backed by the API/DB (not localStorage), so banks
 * created on one device are visible on every other. Mirrors the jobs/candidates
 * resource hooks. Each role bank is its own record; the IQ bank is a singleton.
 */

/* ------------------------------ Assessment ------------------------------ */
export function useAssessmentBanks() {
  return useQuery({
    queryKey: qk.assessmentBanks.all,
    queryFn: () => repositories.assessmentBanks.list(),
  });
}

export function useAssessmentBankMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (bank: RoleQuestionBank) => repositories.assessmentBanks.create(bank),
    ...optimisticOptions<RoleQuestionBank, RoleQuestionBank>(qc, qk.assessmentBanks.all, b =>
      listOps.prepend(b),
    ),
  });
  const update = useMutation({
    mutationFn: (bank: RoleQuestionBank) => repositories.assessmentBanks.update(bank.id, bank),
    ...optimisticOptions<RoleQuestionBank, RoleQuestionBank>(qc, qk.assessmentBanks.all, b =>
      listOps.replaceBy(x => x.id === b.id, b),
    ),
  });
  const remove = useMutation({
    mutationFn: (id: string) => repositories.assessmentBanks.remove(id),
    ...optimisticOptions<string, RoleQuestionBank>(qc, qk.assessmentBanks.all, id =>
      listOps.removeBy(x => x.id === id),
    ),
  });
  return { create, update, remove };
}

/* ------------------------------ Interview ------------------------------- */
export function useInterviewBanks() {
  return useQuery({
    queryKey: qk.interviewBanks.all,
    queryFn: () => repositories.interviewBanks.list(),
  });
}

/** History of interview kits sent to interviewers manually from Settings. */
export function useInterviewKitSends() {
  return useQuery({
    queryKey: qk.interviewKitSends.all,
    queryFn: () => repositories.interviewKitSends.list(),
  });
}

export function useInterviewBankMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (bank: InterviewBank) => repositories.interviewBanks.create(bank),
    ...optimisticOptions<InterviewBank, InterviewBank>(qc, qk.interviewBanks.all, b =>
      listOps.prepend(b),
    ),
  });
  const update = useMutation({
    mutationFn: (bank: InterviewBank) => repositories.interviewBanks.update(bank.id, bank),
    ...optimisticOptions<InterviewBank, InterviewBank>(qc, qk.interviewBanks.all, b =>
      listOps.replaceBy(x => x.id === b.id, b),
    ),
  });
  const remove = useMutation({
    mutationFn: (id: string) => repositories.interviewBanks.remove(id),
    ...optimisticOptions<string, InterviewBank>(qc, qk.interviewBanks.all, id =>
      listOps.removeBy(x => x.id === id),
    ),
  });
  return { create, update, remove };
}

/* ------------------------------ Screening ------------------------------- */
export function useScreeningBanks() {
  return useQuery({
    queryKey: qk.screeningBanks.all,
    queryFn: () => repositories.screeningBanks.list(),
  });
}

export function useScreeningBankMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (bank: ScreeningBank) => repositories.screeningBanks.create(bank),
    ...optimisticOptions<ScreeningBank, ScreeningBank>(qc, qk.screeningBanks.all, b =>
      listOps.prepend(b),
    ),
  });
  const update = useMutation({
    mutationFn: (bank: ScreeningBank) => repositories.screeningBanks.update(bank.id, bank),
    ...optimisticOptions<ScreeningBank, ScreeningBank>(qc, qk.screeningBanks.all, b =>
      listOps.replaceBy(x => x.id === b.id, b),
    ),
  });
  const remove = useMutation({
    mutationFn: (id: string) => repositories.screeningBanks.remove(id),
    ...optimisticOptions<string, ScreeningBank>(qc, qk.screeningBanks.all, id =>
      listOps.removeBy(x => x.id === id),
    ),
  });
  return { create, update, remove };
}

/* --------------------------------- IQ ----------------------------------- */
/** The single shared IQ bank record (or null if none saved yet). */
export function useIqBank() {
  return useQuery({
    queryKey: qk.iqBank.all,
    queryFn: async (): Promise<IqBank | null> => {
      const all = await repositories.iqBank.list();
      return all.find(b => b.id === IQ_BANK_ID) ?? all[0] ?? null;
    },
  });
}

/** Save the IQ bank (upsert the single record). */
export function useSaveIqBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: TestQuestion[]) =>
      repositories.iqBank.create({ id: IQ_BANK_ID, questions }),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.iqBank.all }),
  });
}
