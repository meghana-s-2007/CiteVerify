import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FlaskConical,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { AnalysisJob } from '../types';
import { formatBytes } from '../utils/statusConfig';

interface UploadViewProps {
  onAnalysisComplete: (documentId: number) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onAnalysisComplete }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateAndSelectFile = (file: File | null) => {
    setErrorMsg(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
      setErrorMsg(
        `Unsupported file "${file.name}". CiteVerify accepts .pdf and .docx academic documents only.`
      );
      return;
    }
    if (file.size === 0) {
      setErrorMsg('The selected file is empty (0 bytes). Please choose a valid manuscript.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds the 15 MB upload limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] || null;
    validateAndSelectFile(file);
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          throw new Error('Lost connection while checking analysis progress.');
        }
        const data = (await res.json()) as AnalysisJob;
        setJob(data);

        if (data.status === 'completed' && data.documentId) {
          setSubmitting(false);
          setTimeout(() => {
            onAnalysisComplete(data.documentId!);
          }, 500);
          return;
        }
        if (data.status === 'failed') {
          setSubmitting(false);
          setErrorMsg(data.error || data.message || 'Document analysis failed.');
          return;
        }
        setTimeout(poll, 750);
      } catch (err) {
        setSubmitting(false);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to poll analysis job.');
      }
    };
    await poll();
  };

  const handleAnalyzeDocument = () => {
    if (!selectedFile || submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    setUploadProgress(0);
    setJob({
      jobId: '',
      status: 'queued',
      progress: 5,
      message: 'Uploading manuscript to verification server...',
    });

    const formData = new FormData();
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/analyze');

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          setSubmitting(false);
          setJob(null);
          setErrorMsg(payload.error || 'Upload failed.');
          return;
        }
        setUploadProgress(100);
        void pollJobStatus(payload.jobId);
      } catch {
        setSubmitting(false);
        setJob(null);
        setErrorMsg('Unexpected server response during file upload.');
      }
    };

    xhr.onerror = () => {
      setSubmitting(false);
      setJob(null);
      setErrorMsg('Network error while uploading the document.');
    };

    xhr.send(formData);
  };

  const handleRunLiveSample = async () => {
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    setUploadProgress(100);
    setJob({
      jobId: '',
      status: 'queued',
      progress: 8,
      message: 'Submitting sample manuscript for live Gemini + Semantic Scholar/Crossref verification...',
    });
    try {
      const res = await fetch('/api/analyze-sample', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start live sample verification.');
      }
      await pollJobStatus(data.jobId);
    } catch (err) {
      setSubmitting(false);
      setJob(null);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start sample analysis.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 lg:p-8">
        <h2 className="font-display text-xl font-bold text-slate-950">
          Upload Academic Document
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Submit a research manuscript, literature review, or thesis chapter in PDF or DOCX
          format. CiteVerify extracts factual claims, retrieves original cited papers, and
          evaluates supporting evidence.
        </p>

        {/* Drag and Drop Area */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          className={`mt-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-indigo-600 bg-indigo-50/60'
              : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
          }`}
        >
          <UploadCloud className="mx-auto h-10 w-10 text-indigo-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-900">
            Drag and drop your PDF or DOCX file here
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Maximum file size 15 MB · Extracts text directly on the server
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => validateAndSelectFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Browse Files
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleRunLiveSample}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              <span>Test Live Pipeline with Sample Manuscript</span>
            </button>
          </div>
        </div>

        {/* Selected File Summary */}
        {selectedFile && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-indigo-700 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {formatBytes(selectedFile.size)} · Ready for extraction
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setSelectedFile(null);
                setErrorMsg(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 hover:border-red-300 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Unable to process document</p>
              <p className="mt-0.5 text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Upload & Live Verification Progress */}
        {job && (
          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {job.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                ) : (
                  <Loader2 className="h-5 w-5 text-indigo-700 animate-spin shrink-0" />
                )}
                <p className="text-sm font-semibold text-slate-950">{job.message}</p>
              </div>
              <span className="font-mono text-xs font-semibold text-indigo-800 tabular-nums">
                {job.progress}%
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full bg-indigo-700 transition-all duration-300"
                style={{ width: `${Math.max(uploadProgress > 0 && job.progress < 10 ? uploadProgress * 0.15 : job.progress, 5)}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>1. Text Extraction</span>
              <span aria-hidden="true">·</span>
              <span>2. Claim &amp; Citation Parsing</span>
              <span aria-hidden="true">·</span>
              <span>3. Semantic Scholar &amp; Crossref Retrieval</span>
              <span aria-hidden="true">·</span>
              <span>4. Evidence Verification</span>
            </div>
          </div>
        )}

        {/* Analyze Primary Action */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            disabled={!selectedFile || submitting}
            onClick={handleAnalyzeDocument}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Analyzing Document...</span>
              </>
            ) : (
              <span>Analyze Document</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
