'use client';

import { useParams } from 'next/navigation';
import { RoleQuestionEditor } from '@/components/RoleQuestionEditor';

export default function InterviewBankPage() {
  const params = useParams<{ bankId: string }>();
  return (
    <RoleQuestionEditor
      category="interview"
      slug="interview-questions"
      bankId={params?.bankId ?? ''}
    />
  );
}
