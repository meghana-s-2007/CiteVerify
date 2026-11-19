import React, { useState } from 'react';
import {
  FileBarChart2,
  FilePlus2,
  Files,
  History,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import type { WorkspaceSettings } from '../types';

export type WorkspaceView =
  | 'dashboard'
  | 'upload'
  | 'documents'
  | 'history'
  | 'reports'
  | 'settings';

interface WorkspaceLayoutProps {
  activeView: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
  onGoHome: () => void;
  breadcrumbTitle: string;
  settings: WorkspaceSettings;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
}

const AVATAR_IMG = '/src/assets/images/avatar_researcher_profile_1795103956319.jpg';

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'New Verification', icon: FilePlus2 },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'history', label: 'Verification History', icon: History },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  activeView,
  onNavigate,
  onGoHome,
  breadcrumbTitle,
  settings,
  primaryAction,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const handleSelectNav = (view: WorkspaceView) => {
    onNavigate(view);
    setMobileNavOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-slate-950 text-slate-100">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <button
            type="button"
            onClick={onGoHome}
            className="text-left cursor-pointer group"
          >
            <span className="font-display text-lg font-extrabold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              CiteVerify
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-5 space-y-1" aria-label="Workspace navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {!avatarFailed ? (
            <img
              src={AVATAR_IMG}
              alt={settings.researcherName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-9 w-9 rounded-lg object-cover border border-slate-700 shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-700 text-xs font-bold text-white shrink-0">
              {settings.researcherName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{settings.researcherName}</p>
            <p className="text-xs text-slate-400 truncate">{settings.institution}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoHome}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Landing Page</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[82vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-400 whitespace-nowrap hidden sm:inline">
                  CiteVerify
                </span>
                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <h1 className="font-display font-bold text-slate-950 truncate">
                  {breadcrumbTitle}
                </h1>
              </div>
            </div>

            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-[1360px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
