import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats, DocumentRecord, WorkspaceSettings } from './types';
import { LandingPage } from './components/LandingPage';
import { WorkspaceLayout, type WorkspaceView } from './components/WorkspaceLayout';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import {
  DocumentAnalysisView,
  type AnalysisSubTab,
} from './components/DocumentAnalysisView';
import { ReportView } from './components/ReportView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { exportVerificationReportPdf } from './utils/pdfReport';

const DEFAULT_SETTINGS: WorkspaceSettings = {
  researcherName: 'Dr. Elena Vance',
  institution: 'Center for Scientific Integrity',
  outdatedThresholdYears: 10,
  highlightPassages: true,
};

export default function App() {
  const [inWorkspace, setInWorkspace] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');
  const [analysisSubTab, setAnalysisSubTab] = useState<AnalysisSubTab>('verification');

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadWorkspaceData = useCallback(async (preferredDocId?: number) => {
    setLoading(true);
    setApiError(null);
    try {
      const [dashRes, docsRes, setRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/documents'),
        fetch('/api/settings'),
      ]);

      if (!dashRes.ok || !docsRes.ok) {
        throw new Error('Failed to fetch verification workspace data.');
      }

      const dashData = (await dashRes.json()) as DashboardStats;
      const docsData = (await docsRes.json()) as DocumentRecord[];
      const setData = setRes.ok ? ((await setRes.json()) as WorkspaceSettings) : DEFAULT_SETTINGS;

      setDashboardStats(dashData);
      setDocuments(docsData);
      setSettings(setData);

      const targetId = preferredDocId ?? docsData[0]?.id;
      if (targetId) {
        const docRes = await fetch(`/api/documents/${targetId}`);
        if (docRes.ok) {
          setActiveDoc((await docRes.json()) as DocumentRecord);
        }
      } else {
        setActiveDoc(null);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const selectDocumentById = async (docId: number) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) throw new Error('Could not load the selected document.');
      const doc = (await res.json()) as DocumentRecord;
      setActiveDoc(doc);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to load document.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorkspace = (targetView: WorkspaceView = 'dashboard') => {
    setActiveView(targetView);
    setInWorkspace(true);
  };

  const handleUpdateResearcher = async (name: string, institution: string) => {
    const next = { ...settings, researcherName: name, institution };
    setSettings(next);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
    } catch {
      // Keep local update if offline
    }
  };

  const handleSaveSettings = async (next: WorkspaceSettings) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error('Failed to save settings.');
    setSettings((await res.json()) as WorkspaceSettings);
  };

  const handleAnalysisComplete = async (documentId: number) => {
    await loadWorkspaceData(documentId);
    setAnalysisSubTab('verification');
    setActiveView('documents');
  };

  const handleOpenDocument = async (docId: number, subTab: AnalysisSubTab = 'verification') => {
    await selectDocumentById(docId);
    setAnalysisSubTab(subTab);
    setActiveView('documents');
  };

  const handleOpenReport = async (docId: number) => {
    await selectDocumentById(docId);
    setActiveView('reports');
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document.');
      const nextPreferred = activeDoc?.id === docId ? undefined : activeDoc?.id;
      await loadWorkspaceData(nextPreferred);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not delete document.');
    }
  };

  const handleRestoreDemo = async () => {
    const res = await fetch('/api/demo/restore', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { documentId: number };
      await loadWorkspaceData(data.documentId);
      setActiveView('dashboard');
    }
  };

  if (!inWorkspace) {
    return (
      <LandingPage
        onEnterWorkspace={(target) => handleEnterWorkspace(target || 'dashboard')}
        researcherName={settings.researcherName}
        onUpdateResearcher={handleUpdateResearcher}
      />
    );
  }

  const viewMeta: Record<
    WorkspaceView,
    { title: string; primaryAction?: { label: string; onClick: () => void } }
  > = {
    dashboard: {
      title: 'Dashboard',
      primaryAction: {
        label: 'Upload Document',
        onClick: () => setActiveView('upload'),
      },
    },
    upload: {
      title: 'New Verification',
    },
    documents: {
      title: 'Documents & Verification',
      primaryAction: {
        label: 'New Verification',
        onClick: () => setActiveView('upload'),
      },
    },
    history: {
      title: 'Verification History',
      primaryAction: {
        label: 'Upload Document',
        onClick: () => setActiveView('upload'),
      },
    },
    reports: {
      title: 'Verification Report',
      primaryAction: activeDoc
        ? {
            label: 'Download PDF',
            onClick: () => exportVerificationReportPdf(activeDoc),
          }
        : undefined,
    },
    settings: {
      title: 'Settings',
    },
  };

  const currentMeta = viewMeta[activeView];

  return (
    <WorkspaceLayout
      activeView={activeView}
      onNavigate={setActiveView}
      onGoHome={() => setInWorkspace(false)}
      breadcrumbTitle={currentMeta.title}
      settings={settings}
      primaryAction={currentMeta.primaryAction}
    >
      {apiError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-4"
        >
          <span>{apiError}</span>
          <button
            type="button"
            onClick={() => void loadWorkspaceData()}
            className="text-xs font-semibold underline cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {activeView === 'dashboard' && (
        <DashboardView
          stats={dashboardStats}
          loading={loading}
          researcherName={settings.researcherName}
          onUploadClick={() => setActiveView('upload')}
          onOpenReport={(id) => void handleOpenReport(id)}
          onOpenDocument={(id) => void handleOpenDocument(id, 'verification')}
        />
      )}

      {activeView === 'upload' && (
        <UploadView onAnalysisComplete={(docId) => void handleAnalysisComplete(docId)} />
      )}

      {activeView === 'documents' && (
        <DocumentAnalysisView
          key={`${activeDoc?.id ?? 'none'}-${analysisSubTab}`}
          documents={documents}
          activeDoc={activeDoc}
          loading={loading}
          highlightPassages={settings.highlightPassages}
          initialSubTab={analysisSubTab}
          onSelectDocument={(id) => void selectDocumentById(id)}
          onOpenReport={(id) => void handleOpenReport(id)}
          onUploadClick={() => setActiveView('upload')}
        />
      )}

      {activeView === 'history' && (
        <HistoryView
          documents={documents}
          loading={loading}
          onViewReport={(id) => void handleOpenReport(id)}
          onInspectDocument={(id) => void handleOpenDocument(id, 'comparison')}
          onDeleteDocument={(id) => void handleDeleteDocument(id)}
          onUploadClick={() => setActiveView('upload')}
        />
      )}

      {activeView === 'reports' && (
        <ReportView
          documents={documents}
          activeDoc={activeDoc}
          loading={loading}
          onSelectDocument={(id) => void selectDocumentById(id)}
          onInspectComparison={(id) => void handleOpenDocument(id, 'comparison')}
        />
      )}

      {activeView === 'settings' && (
        <SettingsView
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onRestoreDemo={handleRestoreDemo}
        />
      )}
    </WorkspaceLayout>
  );
}
