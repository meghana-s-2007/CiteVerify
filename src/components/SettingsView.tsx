import React, { useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import type { WorkspaceSettings } from '../types';

interface SettingsViewProps {
  settings: WorkspaceSettings;
  onSaveSettings: (next: WorkspaceSettings) => Promise<void>;
  onRestoreDemo: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRestoreDemo,
}) => {
  const [form, setForm] = useState<WorkspaceSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onSaveSettings(form);
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await onRestoreDemo();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-slate-950">Workspace Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configure researcher attribution for verification reports and citation age thresholds.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="set-name" className="block text-sm font-medium text-slate-800">
              Researcher Display Name
            </label>
            <input
              id="set-name"
              type="text"
              value={form.researcherName}
              onChange={(e) => setForm({ ...form, researcherName: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="set-inst" className="block text-sm font-medium text-slate-800">
              Institution / Affiliation
            </label>
            <input
              id="set-inst"
              type="text"
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="set-threshold" className="block text-sm font-medium text-slate-800">
              Outdated Citation Age Threshold (Years)
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Time-sensitive references older than this threshold are evaluated for potential
              obsolescence.
            </p>
            <input
              id="set-threshold"
              type="number"
              min={1}
              max={50}
              value={form.outdatedThresholdYears}
              onChange={(e) =>
                setForm({
                  ...form,
                  outdatedThresholdYears: Math.max(1, Number(e.target.value) || 10),
                })
              }
              className="mt-2 w-32 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="flex items-start gap-3 pt-1">
            <input
              id="set-highlight"
              type="checkbox"
              checked={form.highlightPassages}
              onChange={(e) => setForm({ ...form, highlightPassages: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-700 focus:ring-indigo-600"
            />
            <div>
              <label htmlFor="set-highlight" className="text-sm font-medium text-slate-800">
                Highlight matching and mismatching elements in Evidence Comparison
              </label>
              <p className="text-xs text-slate-500">
                Displays visual alignment lists alongside side-by-side passages.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-slate-950">
            Demonstration Dataset
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Restore the labeled DEMO DATA manuscript if you deleted it from Verification History.
          </p>
        </div>
        <button
          type="button"
          disabled={restoring}
          onClick={handleRestore}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{restoring ? 'Restoring...' : 'Restore Demo Sample'}</span>
        </button>
      </div>
    </div>
  );
};
