'use client';

import { useParams } from 'next/navigation';
import { RoleQuestionEditor } from '@/components/RoleQuestionEditor';

export default function AssessmentBankPage() {
  const params = useParams<{ bankId: string }>();
  return (
    <RoleQuestionEditor
      category="assessment"
      slug="assessment-questions"
      bankId={params?.bankId ?? ''}
    />
  );
}
