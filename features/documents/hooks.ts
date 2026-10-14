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

/**
 * Save the file.
 *
 * The link is presigned as an attachment server-side, so the browser saves it
 * whatever the file type is. This used to fetch the inline link as a blob
 * instead, and fall back to opening a tab when that cross-origin fetch was
 * blocked - which quietly turned "download" into "view" for every file, and
 * only looked broken for images, because the browser's PDF viewer supplies a
 * download button of its own and its image rendering does not.
 *
 * `a.download` is kept for the filename, and is ignored cross-origin; the
 * server's Content-Disposition carries the real name.
 */
export async function downloadDocument(id: string, fileName?: string): Promise<void> {
  const { url, fileName: fn } = await getDocumentUrl(id, { download: true });
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || fn || 'document';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
