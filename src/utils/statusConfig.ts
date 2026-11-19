import type { VerificationStatus } from '../types';

export interface StatusMeta {
  label: string;
  shortLabel: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
  chartColor: string;
  description: string;
}

export const STATUS_META: Record<VerificationStatus, StatusMeta> = {
  SUPPORTED: {
    label: 'Supported',
    shortLabel: 'Supported',
    textClass: 'text-emerald-700',
    surfaceClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
    chartColor: '#16A34A',
    description: 'Retrieved research evidence directly substantiates the claim.',
  },
  PARTIALLY_SUPPORTED: {
    label: 'Partially Supported',
    shortLabel: 'Partial',
    textClass: 'text-orange-700',
    surfaceClass: 'bg-orange-50/70',
    borderClass: 'border-orange-200',
    chartColor: '#EA580C',
    description: 'Core idea aligns, but the claim overstates scope, magnitude, or caveats.',
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    shortLabel: 'Unsupported',
    textClass: 'text-red-700',
    surfaceClass: 'bg-red-50/70',
    borderClass: 'border-red-200',
    chartColor: '#DC2626',
    description: 'Cited paper does not contain evidence supporting this claim.',
  },
  CONTRADICTORY: {
    label: 'Contradictory',
    shortLabel: 'Contradictory',
    textClass: 'text-purple-700',
    surfaceClass: 'bg-purple-50/70',
    borderClass: 'border-purple-200',
    chartColor: '#7C3AED',
    description: 'Retrieved paper reports findings opposite to the claim.',
  },
  POSSIBLY_OUTDATED: {
    label: 'Possibly Outdated',
    shortLabel: 'Outdated',
    textClass: 'text-amber-700',
    surfaceClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
    chartColor: '#D97706',
    description: 'Citation relies on older literature that may be superseded by newer consensus.',
  },
  MANUAL_REVIEW: {
    label: 'Manual Review',
    shortLabel: 'Manual Review',
    textClass: 'text-slate-700',
    surfaceClass: 'bg-slate-100/80',
    borderClass: 'border-slate-300',
    chartColor: '#64748B',
    description: 'Source abstract was unavailable or inconclusive; human inspection required.',
  },
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
