import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileBarChart2,
  GitCompareArrows,
  Info,
  Search,
  X,
} from 'lucide-react';
import type { ClaimRecord, DocumentRecord, VerificationStatus } from '../types';
import { formatBytes, formatDate, STATUS_META } from '../utils/statusConfig';
import { StatusIndicator } from './StatusIndicator';

export type AnalysisSubTab = 'claims' | 'verification' | 'comparison';

interface DocumentAnalysisViewProps {
  documents: DocumentRecord[];
  activeDoc: DocumentRecord | null;
  loading: boolean;
  highlightPassages: boolean;
  initialSubTab?: AnalysisSubTab;
  onSelectDocument: (docId: number) => void;
  onOpenReport: (docId: number) => void;
  onUploadClick: () => void;
}

const FILTER_OPTIONS: Array<{ id: 'ALL' | VerificationStatus; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'SUPPORTED', label: 'Supported' },
  { id: 'PARTIALLY_SUPPORTED', label: 'Partially Supported' },
  { id: 'UNSUPPORTED', label: 'Unsupported' },
  { id: 'CONTRADICTORY', label: 'Contradictory' },
  { id: 'POSSIBLY_OUTDATED', label: 'Possibly Outdated' },
  { id: 'MANUAL_REVIEW', label: 'Manual Review' },
];

export const DocumentAnalysisView: React.FC<DocumentAnalysisViewProps> = ({
  documents,
  activeDoc,
  loading,
  highlightPassages,
  initialSubTab = 'verification',
  onSelectDocument,
  onOpenReport,
  onUploadClick,
}) => {
  const [subTab, setSubTab] = useState<AnalysisSubTab>(initialSubTab);
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClaimIds, setExpandedClaimIds] = useState<Record<number, boolean>>({});
  const [selectedComparisonId, setSelectedComparisonId] = useState<number | null>(null);

  const claims = activeDoc?.claims || [];

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.statement.toLowerCase().includes(q) ||
        c.citationText.toLowerCase().includes(q) ||
        (c.paperTitle || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [claims, statusFilter, searchQuery]);

  const activeComparisonClaim: ClaimRecord | null = useMemo(() => {
    if (claims.length === 0) return null;
    if (selectedComparisonId) {
      const found = claims.find((c) => c.id === selectedComparisonId);
      if (found) return found;
    }
    return claims[0];
  }, [claims, selectedComparisonId]);

  const toggleExpand = (id: number) => {
    setExpandedClaimIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openComparisonFor = (claimId: number) => {
    setSelectedComparisonId(claimId);
    setSubTab('comparison');
  };

  if (loading && !activeDoc) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (!activeDoc) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <h2 className="font-display text-lg font-bold text-slate-950">No Document Selected</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload a PDF or DOCX academic manuscript to inspect extracted claims and citation
          verdicts.
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
        >
          Upload Document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Selector & Header Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{activeDoc.fileType}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatBytes(activeDoc.fileSize)}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Analyzed {formatDate(activeDoc.uploadDate)}</span>
              {activeDoc.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700">DEMO DATA</span>
                </>
              )}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-950 truncate">
              {activeDoc.filename}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {documents.length > 1 && (
              <select
                aria-label="Select analyzed document"
                value={activeDoc.id}
                onChange={(e) => {
                  setSelectedComparisonId(null);
                  onSelectDocument(Number(e.target.value));
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 max-w-[260px] focus:border-indigo-600 focus:outline-none"
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
              onClick={() => onOpenReport(activeDoc.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-400 hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileBarChart2 className="h-4 w-4" aria-hidden="true" />
              <span>Full Report</span>
            </button>
          </div>
        </div>

        {/* Sub-page Navigation Tabs (Extracted Claims | Citation Verification | Evidence Comparison) */}
        <div className="mt-6 flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
          <button
            type="button"
            onClick={() => setSubTab('claims')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'claims'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Claim Extraction ({claims.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('verification')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'verification'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Citation Verification
          </button>
          <button
            type="button"
            onClick={() => setSubTab('comparison')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'comparison'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            Evidence Comparison
          </button>
        </div>

        {activeDoc.analysisNotes && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <Info className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{activeDoc.analysisNotes}</span>
          </div>
        )}
      </div>

      {/* Empty claims edge case */}
      {claims.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <AlertTriangle className="mx-auto h-9 w-9 text-amber-600" />
          <h3 className="mt-3 font-display text-base font-bold text-slate-950">
            No Cited Claims Extracted
          </h3>
          <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
            No explicit scientific claims with in-text citations were detected in the extracted text
            of this file.
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: CLAIM EXTRACTION PAGE */}
          {subTab === 'claims' && (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => openComparisonFor(claim.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openComparisonFor(claim.id);
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-6 hover:border-indigo-300 transition-colors cursor-pointer"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-indigo-700 tabular-nums">
                        Claim #{claim.claimNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{claim.citationText}</span>
                    </div>
                    <StatusIndicator status={claim.status} />
                  </div>

                  <p className="mt-3 text-base font-medium text-slate-950 leading-relaxed">
                    &ldquo;{claim.statement}&rdquo;
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="text-slate-600 min-w-0">
                      <span className="font-medium text-slate-800">Matched Paper: </span>
                      {claim.paperTitle ? (
                        <span className="text-slate-700">
                          {claim.paperTitle} ({claim.paperYear ?? 'n.d.'})
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          No matching record found via external APIs
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 whitespace-nowrap shrink-0">
                      <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Compare Evidence</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: CITATION VERIFICATION PAGE */}
          {subTab === 'verification' && (
            <div className="space-y-5">
              {/* Filter & Search Toolbar */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {FILTER_OPTIONS.map((opt) => {
                    const active = statusFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStatusFilter(opt.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full lg:w-64 shrink-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter claims or papers..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Advisory Banner */}
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600">
                Confidence indicators measure semantic alignment between the manuscript claim and
                the retrieved abstract. Always inspect the linked primary paper before making
                final editorial decisions.
              </div>

              {filteredClaims.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
                  No claims match the active filter criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClaims.map((claim) => {
                    const expanded = Boolean(expandedClaimIds[claim.id]);
                    return (
                      <article
                        key={claim.id}
                        className="rounded-xl border border-slate-200 bg-white p-6"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono font-semibold text-indigo-700 tabular-nums">
                                Claim #{claim.claimNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>Citation: {claim.citationText}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                Confidence: {claim.confidence}%
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-slate-950 leading-relaxed">
                              &ldquo;{claim.statement}&rdquo;
                            </h3>
                          </div>
                          <StatusIndicator status={claim.status} />
                        </div>

                        {/* Matched Paper Metadata */}
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {claim.paperTitle || 'Matched paper not available'}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {claim.paperAuthors || 'Authors unavailable'}
                                {claim.paperYear ? ` · ${claim.paperYear}` : ''}
                                {claim.paperVenue ? ` · ${claim.paperVenue}` : ''}
                                {claim.paperSourceApi ? ` · Source: ${claim.paperSourceApi}` : ''}
                              </p>
                            </div>
                            {claim.paperUrl && (
                              <a
                                href={claim.paperUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-400 whitespace-nowrap shrink-0"
                              >
                                <span>Original Paper</span>
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* AI Explanation */}
                        <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                          {claim.explanation}
                        </p>

                        {/* Action Footer */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(claim.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 cursor-pointer"
                          >
                            {expanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                <span>Hide Detailed Evidence</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                <span>View Detailed Breakdown</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openComparisonFor(claim.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Side-by-Side Comparison</span>
                          </button>
                        </div>

                        {/* Expandable Detailed Section */}
                        {expanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                            {claim.relevantPassage && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500">
                                  Retrieved Source Passage
                                </p>
                                <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 italic leading-relaxed">
                                  &ldquo;{claim.relevantPassage}&rdquo;
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5">
                                <p className="text-xs font-semibold text-emerald-800">
                                  Aligned Evidence
                                </p>
                                {claim.matchingPoints.length === 0 ? (
                                  <p className="mt-1.5 text-xs text-slate-600">
                                    No direct supporting points identified.
                                  </p>
                                ) : (
                                  <ul className="mt-1.5 space-y-1.5 text-xs text-slate-800">
                                    {claim.matchingPoints.map((pt, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                                        <span>{pt}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="rounded-lg border border-red-200 bg-red-50/40 p-3.5">
                                <p className="text-xs font-semibold text-red-800">
                                  Discrepancies / Gaps
                                </p>
                                {claim.mismatchingPoints.length === 0 ? (
                                  <p className="mt-1.5 text-xs text-slate-600">
                                    No factual discrepancies flagged.
                                  </p>
                                ) : (
                                  <ul className="mt-1.5 space-y-1.5 text-xs text-slate-800">
                                    {claim.mismatchingPoints.map((pt, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <X className="h-3.5 w-3.5 text-red-700 shrink-0 mt-0.5" />
                                        <span>{pt}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVIDENCE COMPARISON PAGE (SIDE-BY-SIDE) */}
          {subTab === 'comparison' && activeComparisonClaim && (
            <div className="space-y-6">
              {/* Claim Selector Rail */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 mb-2.5">
                  Select Claim to Inspect Side-by-Side
                </p>
                <div className="flex flex-wrap gap-2">
                  {claims.map((c) => {
                    const isSelected = c.id === activeComparisonClaim.id;
                    const meta = STATUS_META[c.status] || STATUS_META.MANUAL_REVIEW;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedComparisonId(c.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        Claim #{c.claimNumber} · {meta.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* LEFT SIDE: Original Claim from Uploaded Document */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold text-indigo-700">
                          Manuscript Claim (#{activeComparisonClaim.claimNumber})
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-950">
                          Extracted Statement from Document
                        </h3>
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {activeComparisonClaim.citationText}
                      </span>
                    </div>

                    <blockquote className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-base font-medium text-slate-950 leading-relaxed">
                      &ldquo;{activeComparisonClaim.statement}&rdquo;
                    </blockquote>

                    {highlightPassages && (
                      <div className="mt-5 space-y-3">
                        {activeComparisonClaim.matchingPoints.length > 0 && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                            <p className="text-xs font-semibold text-emerald-800">
                              Matching Elements Verified in Source
                            </p>
                            <ul className="mt-2 space-y-1.5 text-sm text-emerald-950">
                              {activeComparisonClaim.matchingPoints.map((pt, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {activeComparisonClaim.mismatchingPoints.length > 0 && (
                          <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
                            <p className="text-xs font-semibold text-red-800">
                              Mismatching / Unsubstantiated Elements
                            </p>
                            <ul className="mt-2 space-y-1.5 text-sm text-red-950">
                              {activeComparisonClaim.mismatchingPoints.map((pt, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <X className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    Search Query Used: <span className="font-mono">{activeComparisonClaim.searchQuery}</span>
                  </div>
                </div>

                {/* RIGHT SIDE: Retrieved Evidence from Original Research Paper */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold text-indigo-700">
                          Retrieved Research Evidence
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-950">
                          {activeComparisonClaim.paperTitle || 'External Source Record Unavailable'}
                        </h3>
                      </div>
                      <StatusIndicator status={activeComparisonClaim.status} />
                    </div>

                    <div className="mt-4 text-xs text-slate-600 space-y-1">
                      <p>
                        <span className="font-semibold text-slate-800">Authors: </span>
                        {activeComparisonClaim.paperAuthors || 'Unavailable'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Publication: </span>
                        {activeComparisonClaim.paperVenue || 'Venue unavailable'}
                        {activeComparisonClaim.paperYear
                          ? ` (${activeComparisonClaim.paperYear})`
                          : ''}
                        {activeComparisonClaim.paperSourceApi
                          ? ` · Retrieved via ${activeComparisonClaim.paperSourceApi}`
                          : ''}
                      </p>
                      {activeComparisonClaim.paperDoi && (
                        <p className="font-mono">
                          DOI: {activeComparisonClaim.paperDoi}
                        </p>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Relevant Research Paper Passage
                      </p>
                      <div
                        className={`rounded-lg border p-4 text-sm leading-relaxed ${
                          activeComparisonClaim.status === 'SUPPORTED'
                            ? 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                            : activeComparisonClaim.status === 'CONTRADICTORY' ||
                                activeComparisonClaim.status === 'UNSUPPORTED'
                              ? 'border-red-200 bg-red-50/40 text-slate-900'
                              : 'border-slate-200 bg-slate-50 text-slate-900'
                        }`}
                      >
                        {activeComparisonClaim.relevantPassage ||
                          activeComparisonClaim.paperAbstract ||
                          'No passage could be retrieved from external academic APIs.'}
                      </div>
                    </div>

                    {activeComparisonClaim.paperAbstract &&
                      activeComparisonClaim.paperAbstract !== activeComparisonClaim.relevantPassage && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-500 mb-1.5">
                            Full Retrieved Abstract
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto pr-1">
                            {activeComparisonClaim.paperAbstract}
                          </p>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-600 tabular-nums">
                      Confidence Indicator: {activeComparisonClaim.confidence}%
                    </span>
                    {activeComparisonClaim.paperUrl ? (
                      <a
                        href={activeComparisonClaim.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                      >
                        <span>Open Original Paper</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No external URL returned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dedicated "Why This Verdict?" Section */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-slate-950">
                    Why This Verdict?
                  </h3>
                  <StatusIndicator status={activeComparisonClaim.status} />
                </div>
                <p className="mt-3 text-base text-slate-800 leading-relaxed">
                  {activeComparisonClaim.whyVerdict}
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {activeComparisonClaim.explanation}
                </p>
                <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  Disclaimer: Automated verdicts assist human verification by comparing claims
                  against retrieved abstracts. They do not replace reading full-text primary
                  sources.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
