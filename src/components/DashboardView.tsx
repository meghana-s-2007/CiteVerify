import React from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ArrowRight, FilePlus2, FileText } from 'lucide-react';
import type { DashboardStats } from '../types';
import { formatDate, STATUS_META } from '../utils/statusConfig';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  researcherName: string;
  onUploadClick: () => void;
  onOpenReport: (docId: number) => void;
  onOpenDocument: (docId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  researcherName,
  onUploadClick,
  onOpenReport,
  onOpenDocument,
}) => {
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-20 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  const s = stats || {
    totalDocuments: 0,
    totalClaimsVerified: 0,
    supportedClaims: 0,
    flaggedCitations: 0,
    breakdown: {
      SUPPORTED: 0,
      PARTIALLY_SUPPORTED: 0,
      UNSUPPORTED: 0,
      CONTRADICTORY: 0,
      POSSIBLY_OUTDATED: 0,
      MANUAL_REVIEW: 0,
    },
    recentDocuments: [],
  };

  const doughnutData = {
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
          s.breakdown.SUPPORTED,
          s.breakdown.PARTIALLY_SUPPORTED,
          s.breakdown.UNSUPPORTED,
          s.breakdown.CONTRADICTORY,
          s.breakdown.POSSIBLY_OUTDATED,
          s.breakdown.MANUAL_REVIEW,
        ],
        backgroundColor: [
          STATUS_META.SUPPORTED.chartColor,
          STATUS_META.PARTIALLY_SUPPORTED.chartColor,
          STATUS_META.UNSUPPORTED.chartColor,
          STATUS_META.CONTRADICTORY.chartColor,
          STATUS_META.POSSIBLY_OUTDATED.chartColor,
          STATUS_META.MANUAL_REVIEW.chartColor,
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  const barDocs = s.recentDocuments.slice(0, 5).reverse();
  const barData = {
    labels: barDocs.map((d) =>
      d.filename.length > 22 ? `${d.filename.slice(0, 20)}...` : d.filename
    ),
    datasets: [
      {
        label: 'Supported',
        data: barDocs.map((d) => d.supportedCount),
        backgroundColor: '#16A34A',
        borderRadius: 4,
      },
      {
        label: 'Flagged (Partial / Unsupported / Contradictory / Outdated)',
        data: barDocs.map(
          (d) =>
            d.partiallySupportedCount +
            d.unsupportedCount +
            d.contradictoryCount +
            d.outdatedCount
        ),
        backgroundColor: '#DC2626',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-950">
            Welcome back, {researcherName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload a scholarly manuscript to verify claims against Semantic Scholar and Crossref
            evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          <span>Upload New Document</span>
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Documents Analyzed</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-950 tabular-nums">
            {s.totalDocuments}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Claims Verified</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-950 tabular-nums">
            {s.totalClaimsVerified}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Supported Claims</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-700 tabular-nums">
            {s.supportedClaims}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Flagged Citations</p>
          <p className="mt-2 font-display text-3xl font-bold text-red-700 tabular-nums">
            {s.flaggedCitations}
          </p>
        </div>
      </div>

      {/* Chart.js Statistics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-bold text-slate-950">
            Claim Verification Breakdown
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Distribution across all verified claims in your workspace
          </p>
          <div className="mt-5 h-64 flex items-center justify-center">
            {s.totalClaimsVerified > 0 ? (
              <Doughnut
                data={doughnutData}
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
              <p className="text-sm text-slate-500">No claims verified yet.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-bold text-slate-950">
            Supported vs. Flagged Citations by Document
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Comparative audit across recent manuscripts
          </p>
          <div className="mt-5 h-64">
            {barDocs.length > 0 ? (
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { precision: 0 },
                    },
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 12, font: { size: 11 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Upload a document to populate comparison charts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-slate-950">Recent Activity</h3>
            <p className="text-xs text-slate-500">
              Recently analyzed manuscripts and verification outcomes
            </p>
          </div>
        </div>

        {s.recentDocuments.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-medium text-slate-900">No manuscripts analyzed yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload a PDF or DOCX document to extract claims and verify citations.
            </p>
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
            >
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Document Name</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4 text-right">Claims</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {s.recentDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="font-medium text-slate-950 hover:text-indigo-700 text-left cursor-pointer"
                      >
                        {doc.filename}
                      </button>
                      <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                        <span>{doc.fileType}</span>
                        {doc.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700">DEMO DATA</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDate(doc.uploadDate)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                      {doc.totalClaims}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap">
                      {doc.overallStatus}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenReport(doc.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
                      >
                        <span>View Report</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
