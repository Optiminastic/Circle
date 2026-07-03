/**
 * Turn already-rendered offer-letter A4 pages (`.ol-page` divs from
 * OfferLetterPaged) into a single PDF Blob, by capturing each page with
 * html2canvas-pro (Tailwind v4 emits oklch colours, which plain html2canvas
 * can't parse) and assembling them with jsPDF. Used only to build the email
 * attachment — the on-screen preview/print still use OfferLetterPaged directly.
 */

export async function pagesToPdfBlob(pages: HTMLElement[]): Promise<Blob> {
  if (pages.length === 0) throw new Error('No pages to export');
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i += 1) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, 0, pageW, pageH);
  }
  return pdf.output('blob');
}

/** Read a Blob/File as a base64 string (no data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
