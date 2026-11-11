import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { DOCUMENT_PAGES, DocumentPageKey, DocumentSetRecord } from '../types/billing';

export async function exportSelectedPagesToPdf(
  selectedKeys: DocumentPageKey[],
  pageElementsMap: Record<DocumentPageKey, HTMLDivElement | null>,
  docSet: DocumentSetRecord,
  onProgress?: (stepText: string) => void
): Promise<void> {
  const orderedPages = DOCUMENT_PAGES.filter((p) => selectedKeys.includes(p.key));
  if (orderedPages.length === 0) {
    throw new Error('กรุณาติ๊กเลือกอย่างน้อย 1 หน้าเอกสารก่อนดาวน์โหลด PDF');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidthMm = 210;
  const pdfHeightMm = 297;

  for (let i = 0; i < orderedPages.length; i++) {
    const pageMeta = orderedPages[i];
    const el = pageElementsMap[pageMeta.key];
    if (!el) continue;

    if (onProgress) {
      onProgress(`กำลังสร้างหน้า ${i + 1}/${orderedPages.length}: ${pageMeta.thaiTitle}...`);
    }

    const dataUrl = await toJpeg(el, {
      quality: 0.96,
      pixelRatio: 2.2,
      backgroundColor: '#ffffff',
      width: 794,
      height: Math.max(1123, el.scrollHeight),
      style: {
        transform: 'none',
        boxShadow: 'none',
        border: 'none',
      },
    });

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');
  }

  // Construct descriptive filename
  const cleanCustomer = (docSet.customerName || 'Customer')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 35);

  const suffix =
    orderedPages.length === 4
      ? 'ครบชุด4หน้า'
      : orderedPages.map((p) => p.thaiTitle.split(' ')[0]).join('-');

  const filename = `${docSet.quotationNo || 'DOC'}_${cleanCustomer}_${suffix}.pdf`;
  pdf.save(filename);
}
