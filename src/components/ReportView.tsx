import React from 'react';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Download, ExternalLink, FileText, GitCompareArrows } from 'lucide-react';
import type { DocumentRecord } from '../types';
import { exportVerificationReportPdf } from '../utils/pdfReport';
import { formatDateTime, STATUS_META } from '../utils/statusConfig';
import { StatusIndicator } from './StatusIndicator';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ReportViewProps {
  documents: DocumentRecord[];
  activeDoc: DocumentRecord | null;
  loading: boolean;
  onSelectDocument: (docId: number) => void;
  onInspectComparison: (docId: number) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  documents,
  activeDoc,
  loading,
  onSelectDocument,
  onInspectComparison,
}) => {
  if (loading && !activeDoc) {
    return <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />;
  }

  if (!activeDoc) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-950">
          No Verification Report Selected
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Select an analyzed document from history or upload a new manuscript to generate a
          verification report.
        </p>
      </div>
    );
  }

  const claims = activeDoc.claims || [];

  const pieData = {
    labels: [
      STATUS_META.SUPPORTED.label,
      STATUS_META.PARTIALLY_SUPPORTED.label,
      STATUS_META.UNSUPPORTED.label,
      STATUS_META.CONTRADICTORY.label,
      STATUS_META.POSSIBLY_OUTDATED.label,
      STATUS_META.MANUAL_REVIEW.label,
    ],
    datasets: [
      {
        data: [
          activeDoc.supportedCount,
          activeDoc.partiallySupportedCount,
          activeDoc.unsupportedCount,
          activeDoc.contradictoryCount,
          activeDoc.outdatedCount,
          activeDoc.manualReviewCount,
        ],
        backgroundColor: [
          STATUS_META.SUPPORTED.chartColor,
          STATUS_META.PARTIALLY_SUPPORTED.chartColor,
          STATUS_META.UNSUPPORTED.chartColor,
          STATUS_META.CONTRADICTORY.chartColor,
          STATUS_META.POSSIBLY_OUTDATED.chartColor,
          STATUS_META.MANUAL_REVIEW.chartColor,
        ],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  const flaggedTotal =
    activeDoc.partiallySupportedCount +
    activeDoc.unsupportedCount +
    activeDoc.contradictoryCount +
    activeDoc.outdatedCount;

  const uniquePapers = claims.filter((c) => Boolean(c.paperTitle));

  return (
    <div className="space-y-6">
      {/* Top Report Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Verification Summary Report</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatDateTime(activeDoc.uploadDate)}</span>
              {activeDoc.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700">DEMO DATA</span>
                </>
              )}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-950 truncate">
              {activeDoc.filename}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {documents.length > 1 && (
              <select
                aria-label="Choose document report"
                value={activeDoc.id}
                onChange={(e) => onSelectDocument(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 max-w-[240px]"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => onInspectComparison(activeDoc.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
              <span>Evidence View</span>
            </button>

            <button
              type="button"
              onClick={() => exportVerificationReportPdf(activeDoc)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download Report (PDF)</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs text-slate-500">Total Claims</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-950 tabular-nums">
              {activeDoc.totalClaims}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5">
            <p className="text-xs text-emerald-800">Supported</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-800 tabular-nums">
              {activeDoc.supportedCount}
            </p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3.5">
            <p className="text-xs text-orange-800">Partial</p>
            <p className="mt-1 font-display text-2xl font-bold text-orange-800 tabular-nums">
              {activeDoc.partiallySupportedCount}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5">
            <p className="text-xs text-red-800">Unsupported</p>
            <p className="mt-1 font-display text-2xl font-bold text-red-800 tabular-nums">
              {activeDoc.unsupportedCount}
            </p>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5">
            <p className="text-xs text-purple-800">Contradictory</p>
            <p className="mt-1 font-display text-2xl font-bold text-purple-800 tabular-nums">
              {activeDoc.contradictoryCount}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
            <p className="text-xs text-amber-800">Outdated</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber-800 tabular-nums">
              {activeDoc.outdatedCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-300 bg-slate-100/70 p-3.5">
            <p className="text-xs text-slate-700">Manual Review</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-800 tabular-nums">
              {activeDoc.manualReviewCount}
            </p>
          </div>
        </div>
      </div>

      {/* Pie Chart + Executive Verification Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-bold text-slate-950">
            Claim Distribution
          </h3>
          <div className="mt-4 h-64 flex items-center justify-center">
            {activeDoc.totalClaims > 0 ? (
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 11 } },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-sm text-slate-500">No claims to visualize.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-950">
              Overall Verification Summary
            </h3>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Out of <strong className="tabular-nums">{activeDoc.totalClaims}</strong> extracted
              scientific claims,{' '}
              <strong className="text-emerald-700 tabular-nums">
                {activeDoc.supportedCount}
              </strong>{' '}
              were directly supported by retrieved research abstracts,{' '}
              <strong className="text-red-700 tabular-nums">{flaggedTotal}</strong> were flagged
              for partial alignment, missing support, contradiction, or outdated consensus, and{' '}
              <strong className="tabular-nums">{activeDoc.manualReviewCount}</strong> require manual
              inspection due to unavailable or paywalled abstracts.
            </p>

            {activeDoc.analysisNotes && (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                {activeDoc.analysisNotes}
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Academic Integrity Advisory: AI-generated verification verdicts indicate abstract-level
            alignment and should never be treated as guaranteed academic truth without reviewing
            the primary publication.
          </div>
        </div>
      </div>

      {/* Detailed Claim-by-Claim Results */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-display text-base font-bold text-slate-950">
            Detailed Claim-by-Claim Results
          </h3>
        </div>
        <div className="divide-y divide-slate-200">
          {claims.map((c) => (
            <div key={c.id} className="p-6 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-indigo-700 tabular-nums">
                    Claim #{c.claimNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{c.citationText}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Confidence: {c.confidence}%</span>
                </div>
                <StatusIndicator status={c.status} />
              </div>

              <p className="text-sm font-semibold text-slate-950">&ldquo;{c.statement}&rdquo;</p>
              <p className="text-sm text-slate-700 leading-relaxed">{c.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Research Paper References */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-display text-base font-bold text-slate-950">
          Retrieved Research Paper References
        </h3>
        {uniquePapers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No external research papers were matched for this document.
          </p>
        ) : (
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            {uniquePapers.map((c, idx) => (
              <li
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <span className="font-mono text-xs text-slate-500 mr-2 tabular-nums">
                    [{idx + 1}]
                  </span>
                  <span>
                    {c.paperAuthors || 'Unknown Authors'} ({c.paperYear ?? 'n.d.'}).{' '}
                    <strong className="text-slate-900">{c.paperTitle}</strong>.{' '}
                    {c.paperVenue ? <em>{c.paperVenue}.</em> : null}
                  </span>
                </div>
                {c.paperUrl && (
                  <a
                    href={c.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>Source Link</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
