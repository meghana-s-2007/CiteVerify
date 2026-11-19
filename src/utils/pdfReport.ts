import { jsPDF } from 'jspdf';
import type { DocumentRecord } from '../types';
import { formatDateTime, STATUS_META } from './statusConfig';

export function exportVerificationReportPdf(docRecord: DocumentRecord): void {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 48) {
      pdf.addPage();
      y = 48;
    }
  };

  // Header
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 84, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('CiteVerify — Citation Verification Report', margin, 36);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(203, 213, 225);
  pdf.text("Scientific Claim & Evidence Audit  |  Don't just cite it. Verify it.", margin, 56);

  y = 110;
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  const titleLines = pdf.splitTextToSize(`Document: ${docRecord.filename}`, contentWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 16 + 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Analysis Date: ${formatDateTime(docRecord.uploadDate)}   |   Format: ${docRecord.fileType}   |   Overall Status: ${docRecord.overallStatus}`,
    margin,
    y
  );
  y += 20;

  if (docRecord.isDemo) {
    pdf.setTextColor(180, 83, 9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTICE: This record is labeled DEMO DATA for demonstration purposes.', margin, y);
    y += 18;
  }

  // Summary breakdown grid
  pdf.setDrawColor(226, 232, 240);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentWidth, 64, 'FD');

  const summaryCols = [
    { label: 'Total Claims', value: String(docRecord.totalClaims) },
    { label: 'Supported', value: String(docRecord.supportedCount) },
    { label: 'Partial', value: String(docRecord.partiallySupportedCount) },
    { label: 'Unsupported', value: String(docRecord.unsupportedCount) },
    { label: 'Contradictory', value: String(docRecord.contradictoryCount) },
    { label: 'Outdated', value: String(docRecord.outdatedCount) },
    { label: 'Manual Review', value: String(docRecord.manualReviewCount) },
  ];

  const colW = contentWidth / summaryCols.length;
  summaryCols.forEach((col, i) => {
    const cx = margin + i * colW + 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(col.label, cx, y + 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(15, 23, 42);
    pdf.text(col.value, cx, y + 44);
  });

  y += 84;

  // Academic disclaimer
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const disclaimerLines = pdf.splitTextToSize(
    'Methodological Note: AI-assisted verification evaluates claims against retrieved abstracts and bibliographic records from Semantic Scholar and Crossref. Verdicts are decision-support indicators, not guaranteed academic truth; researchers should inspect full-text primary sources before final publication.',
    contentWidth
  );
  pdf.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 12 + 16;

  // Claim-by-Claim Section
  const claims = docRecord.claims || [];
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Claim-by-Claim Verification Details', margin, y);
  y += 18;

  for (const claim of claims) {
    const statusLabel = STATUS_META[claim.status]?.label || claim.status;
    const stmtLines = pdf.splitTextToSize(`Claim #${claim.claimNumber}: ${claim.statement}`, contentWidth - 20);
    const expLines = pdf.splitTextToSize(`AI Explanation: ${claim.explanation}`, contentWidth - 20);
    const paperTitleText = claim.paperTitle
      ? `${claim.paperTitle} (${claim.paperAuthors || 'Unknown authors'}, ${claim.paperYear ?? 'n.d.'})`
      : 'No matching paper retrieved';
    const paperLines = pdf.splitTextToSize(`Matched Source: ${paperTitleText}`, contentWidth - 20);
    const blockHeight = 44 + stmtLines.length * 13 + expLines.length * 12 + paperLines.length * 12 + 24;

    ensureSpace(blockHeight);

    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, y, contentWidth, blockHeight - 10, 'D');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 64, 175);
    pdf.text(
      `STATUS: ${statusLabel.toUpperCase()}   |   Confidence: ${claim.confidence}%   |   Citation: ${claim.citationText}`,
      margin + 10,
      y + 18
    );

    let innerY = y + 36;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(stmtLines, margin + 10, innerY);
    innerY += stmtLines.length * 13 + 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(paperLines, margin + 10, innerY);
    innerY += paperLines.length * 12 + 4;

    pdf.setTextColor(71, 85, 105);
    pdf.text(expLines, margin + 10, innerY);

    y += blockHeight;
  }

  // References Bibliography
  ensureSpace(80);
  y += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Retrieved Research Paper References', margin, y);
  y += 18;

  const uniqueRefs = claims.filter((c) => c.paperTitle);
  if (uniqueRefs.length === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No external research paper references were matched.', margin, y);
  } else {
    uniqueRefs.forEach((c, idx) => {
      const refLine = `[${idx + 1}] ${c.paperAuthors || 'Unknown authors'} (${c.paperYear ?? 'n.d.'}). ${c.paperTitle}. ${c.paperVenue || ''} ${c.paperUrl || ''}`.trim();
      const lines = pdf.splitTextToSize(refLine, contentWidth);
      ensureSpace(lines.length * 12 + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      pdf.text(lines, margin, y);
      y += lines.length * 12 + 6;
    });
  }

  const safeName = docRecord.filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.(pdf|docx)$/i, '');
  pdf.save(`CiteVerify_Report_${safeName}.pdf`);
}
