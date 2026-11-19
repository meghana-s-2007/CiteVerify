import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { VerificationStatus } from '../types';
import { STATUS_META } from '../utils/statusConfig';

interface StatusIndicatorProps {
  status: VerificationStatus;
  compact?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, compact = false }) => {
  const meta = STATUS_META[status] || STATUS_META.MANUAL_REVIEW;

  const Icon = (() => {
    switch (status) {
      case 'SUPPORTED':
        return CheckCircle2;
      case 'PARTIALLY_SUPPORTED':
        return AlertTriangle;
      case 'UNSUPPORTED':
        return XCircle;
      case 'CONTRADICTORY':
        return ShieldAlert;
      case 'POSSIBLY_OUTDATED':
        return Clock;
      default:
        return HelpCircle;
    }
  })();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${meta.surfaceClass} ${meta.borderClass} ${meta.textClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
};
