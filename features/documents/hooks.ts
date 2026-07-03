'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteDocument, getDocumentUrl, listDocuments, uploadDocument } from '@/lib/api/documents';

const documentsKey = (entityType: string, entityId: string) => ['documents', entityType, entityId] as const;

export function useDocuments(entityType: string, entityId: string) {
  return useQuery({
    queryKey: documentsKey(entityType, entityId),
    queryFn: () => listDocuments(entityType, entityId),
    enabled: Boolean(entityId),
  });
}

export function useDocumentMutations(entityType: string, entityId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: documentsKey(entityType, entityId) });

  const upload = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) =>
      uploadDocument({ entityType, entityId, category, file }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: invalidate,
  });

  return { upload, remove };
}

/** Fetch a fresh presigned URL and open the file in a new tab. */
export async function openDocument(id: string): Promise<void> {
  const { url } = await getDocumentUrl(id);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Download the file (fetch the presigned URL as a blob and save it). Falls back
 *  to opening it in a tab if the cross-origin fetch is blocked. */
export async function downloadDocument(id: string, fileName?: string): Promise<void> {
  const { url, fileName: fn } = await getDocumentUrl(id);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || fn || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
