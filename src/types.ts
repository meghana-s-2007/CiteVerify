export type VerificationStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'UNSUPPORTED'
  | 'CONTRADICTORY'
  | 'POSSIBLY_OUTDATED'
  | 'MANUAL_REVIEW';

export interface ClaimRecord {
  id: number;
  documentId: number;
  claimNumber: number;
  statement: string;
  citationText: string;
  searchQuery: string;
  paperTitle: string | null;
  paperAuthors: string | null;
  paperYear: number | null;
  paperVenue: string | null;
  paperDoi: string | null;
  paperUrl: string | null;
  paperSourceApi: string | null;
  paperAbstract: string | null;
  relevantPassage: string | null;
  status: VerificationStatus;
  confidence: number;
  explanation: string;
  whyVerdict: string;
  matchingPoints: string[];
  mismatchingPoints: string[];
  apiUnavailableReason: string | null;
}

export interface DocumentRecord {
  id: number;
  filename: string;
  fileSize: number;
  fileType: 'PDF' | 'DOCX' | 'TEXT';
  uploadDate: string;
  extractedTextPreview: string;
  totalClaims: number;
  supportedCount: number;
  partiallySupportedCount: number;
  unsupportedCount: number;
  contradictoryCount: number;
  outdatedCount: number;
  manualReviewCount: number;
  overallStatus: string;
  isDemo: boolean;
  analysisNotes: string | null;
  claims?: ClaimRecord[];
}

export interface DashboardStats {
  totalDocuments: number;
  totalClaimsVerified: number;
  supportedClaims: number;
  flaggedCitations: number;
  breakdown: {
    SUPPORTED: number;
    PARTIALLY_SUPPORTED: number;
    UNSUPPORTED: number;
    CONTRADICTORY: number;
    POSSIBLY_OUTDATED: number;
    MANUAL_REVIEW: number;
  };
  recentDocuments: DocumentRecord[];
}

export interface AnalysisJob {
  jobId: string;
  status: 'queued' | 'extracting_text' | 'extracting_claims' | 'retrieving_papers' | 'verifying_evidence' | 'completed' | 'failed';
  progress: number;
  message: string;
  documentId?: number;
  error?: string;
}

export interface WorkspaceSettings {
  researcherName: string;
  institution: string;
  outdatedThresholdYears: number;
  highlightPassages: boolean;
}
