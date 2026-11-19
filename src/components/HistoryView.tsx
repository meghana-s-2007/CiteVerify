import React, { useMemo, useState } from 'react';
import { ArrowRight, FilePlus2, Search, Trash2 } from 'lucide-react';
import type { DocumentRecord } from '../types';
import { formatDate } from '../utils/statusConfig';

interface HistoryViewProps {
  documents: DocumentRecord[];
  loading: boolean;
  onViewReport: (docId: number) => void;
  onInspectDocument: (docId: number) => void;
  onDeleteDocument: (docId: number) => void;
  onUploadClick: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  documents,
  loading,
  onViewReport,
  onInspectDocument,
  onDeleteDocument,
  onUploadClick,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.filename.toLowerCase().includes(q) ||
        d.overallStatus.toLowerCase().includes(q)
    );
  }, [documents, query]);

  if (loading && documents.length === 0) {
    return <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-950">
            Verification History
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            All manuscripts processed and stored in your local CiteVerify database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-60">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            <span>New Upload</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            {documents.length === 0
              ? 'No verification history yet. Upload a PDF or DOCX manuscript to begin.'
              : 'No documents match your search query.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-6">Document Name</th>
                  <th className="py-3.5 px-4">Date Analyzed</th>
                  <th className="py-3.5 px-4 text-right">Claims</th>
                  <th className="py-3.5 px-4 text-right">Flagged Citations</th>
                  <th className="py-3.5 px-4">Overall Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((doc) => {
                  const flagged =
                    doc.partiallySupportedCount +
                    doc.unsupportedCount +
                    doc.contradictoryCount +
                    doc.outdatedCount;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <button
                          type="button"
                          onClick={() => onInspectDocument(doc.id)}
                          className="font-semibold text-slate-950 hover:text-indigo-700 text-left cursor-pointer"
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
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-red-700 font-semibold">
                        {flagged}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap">
                        {doc.overallStatus}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onViewReport(doc.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 cursor-pointer"
                          >
                            <span>View Report</span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDocument(doc.id)}
                            aria-label={`Delete ${doc.filename}`}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-300 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
