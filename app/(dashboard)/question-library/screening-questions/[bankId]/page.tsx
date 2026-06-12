'use client';

import { useParams } from 'next/navigation';
import { ScreeningEditor } from '@/components/ScreeningEditor';

export default function ScreeningBankPage() {
  const params = useParams<{ bankId: string }>();
  return <ScreeningEditor bankId={params?.bankId ?? ''} />;
}
