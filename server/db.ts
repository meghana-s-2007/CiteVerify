import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { ClaimRecord, DashboardStats, DocumentRecord, VerificationStatus, WorkspaceSettings } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'citeverify.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    upload_date TEXT NOT NULL,
    extracted_text_preview TEXT NOT NULL,
    total_claims INTEGER NOT NULL DEFAULT 0,
    supported_count INTEGER NOT NULL DEFAULT 0,
    partially_supported_count INTEGER NOT NULL DEFAULT 0,
    unsupported_count INTEGER NOT NULL DEFAULT 0,
    contradictory_count INTEGER NOT NULL DEFAULT 0,
    outdated_count INTEGER NOT NULL DEFAULT 0,
    manual_review_count INTEGER NOT NULL DEFAULT 0,
    overall_status TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0,
    analysis_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    claim_number INTEGER NOT NULL,
    statement TEXT NOT NULL,
    citation_text TEXT NOT NULL,
    search_query TEXT NOT NULL,
    paper_title TEXT,
    paper_authors TEXT,
    paper_year INTEGER,
    paper_venue TEXT,
    paper_doi TEXT,
    paper_url TEXT,
    paper_source_api TEXT,
    paper_abstract TEXT,
    relevant_passage TEXT,
    status TEXT NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 0,
    explanation TEXT NOT NULL,
    why_verdict TEXT NOT NULL,
    matching_points_json TEXT NOT NULL DEFAULT '[]',
    mismatching_points_json TEXT NOT NULL DEFAULT '[]',
    api_unavailable_reason TEXT,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    researcher_name TEXT NOT NULL DEFAULT 'Dr. Elena Vance',
    institution TEXT NOT NULL DEFAULT 'Center for Scientific Integrity',
    outdated_threshold_years INTEGER NOT NULL DEFAULT 10,
    highlight_passages INTEGER NOT NULL DEFAULT 1
  );
`);

const existingSettings = db.prepare('SELECT id FROM workspace_settings WHERE id = 1').get();
if (!existingSettings) {
  db.prepare(`
    INSERT INTO workspace_settings (id, researcher_name, institution, outdated_threshold_years, highlight_passages)
    VALUES (1, 'Dr. Elena Vance', 'Center for Scientific Integrity', 10, 1)
  `).run();
}

function mapClaimRow(row: Record<string, unknown>): ClaimRecord {
  let matchingPoints: string[] = [];
  let mismatchingPoints: string[] = [];
  try {
    matchingPoints = JSON.parse(String(row.matching_points_json || '[]'));
  } catch {
    matchingPoints = [];
  }
  try {
    mismatchingPoints = JSON.parse(String(row.mismatching_points_json || '[]'));
  } catch {
    mismatchingPoints = [];
  }

  return {
    id: Number(row.id),
    documentId: Number(row.document_id),
    claimNumber: Number(row.claim_number),
    statement: String(row.statement),
    citationText: String(row.citation_text),
    searchQuery: String(row.search_query),
    paperTitle: row.paper_title ? String(row.paper_title) : null,
    paperAuthors: row.paper_authors ? String(row.paper_authors) : null,
    paperYear: row.paper_year !== null && row.paper_year !== undefined ? Number(row.paper_year) : null,
    paperVenue: row.paper_venue ? String(row.paper_venue) : null,
    paperDoi: row.paper_doi ? String(row.paper_doi) : null,
    paperUrl: row.paper_url ? String(row.paper_url) : null,
    paperSourceApi: row.paper_source_api ? String(row.paper_source_api) : null,
    paperAbstract: row.paper_abstract ? String(row.paper_abstract) : null,
    relevantPassage: row.relevant_passage ? String(row.relevant_passage) : null,
    status: String(row.status) as VerificationStatus,
    confidence: Number(row.confidence),
    explanation: String(row.explanation),
    whyVerdict: String(row.why_verdict),
    matchingPoints,
    mismatchingPoints,
    apiUnavailableReason: row.api_unavailable_reason ? String(row.api_unavailable_reason) : null,
  };
}

function mapDocRow(row: Record<string, unknown>): DocumentRecord {
  return {
    id: Number(row.id),
    filename: String(row.filename),
    fileSize: Number(row.file_size),
    fileType: String(row.file_type) as 'PDF' | 'DOCX' | 'TEXT',
    uploadDate: String(row.upload_date),
    extractedTextPreview: String(row.extracted_text_preview),
    totalClaims: Number(row.total_claims),
    supportedCount: Number(row.supported_count),
    partiallySupportedCount: Number(row.partially_supported_count),
    unsupportedCount: Number(row.unsupported_count),
    contradictoryCount: Number(row.contradictory_count),
    outdatedCount: Number(row.outdated_count),
    manualReviewCount: Number(row.manual_review_count),
    overallStatus: String(row.overall_status),
    isDemo: Number(row.is_demo) === 1,
    analysisNotes: row.analysis_notes ? String(row.analysis_notes) : null,
  };
}

export function seedDemoDocumentIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM documents').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  insertDemoDocument();
}

export function insertDemoDocument(): number {
  const existingDemo = db.prepare('SELECT id FROM documents WHERE is_demo = 1').get() as { id: number } | undefined;
  if (existingDemo) return existingDemo.id;

  const insertDoc = db.prepare(`
    INSERT INTO documents (
      filename, file_size, file_type, upload_date, extracted_text_preview,
      total_claims, supported_count, partially_supported_count, unsupported_count,
      contradictory_count, outdated_count, manual_review_count,
      overall_status, is_demo, analysis_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const nowIso = new Date().toISOString();
  const preview =
    'DEMO DATA SAMPLE MANUSCRIPT: Sleep-dependent memory consolidation and synaptic homeostasis in mammalian cortex. ' +
    'This demonstration document illustrates how CiteVerify classifies Supported, Partially Supported, Unsupported, Contradictory, and Possibly Outdated citations.';

  const result = insertDoc.run(
    'DEMO DATA — Sleep Consolidation & Neural Plasticity Review.pdf',
    428190,
    'PDF',
    nowIso,
    preview,
    5,
    1,
    1,
    1,
    1,
    1,
    0,
    'Flagged (4 Issues)',
    'DEMO DATA: Pre-loaded demonstration manuscript showcasing all 5 verification categories. Upload your own PDF or DOCX document for live Gemini + Semantic Scholar/Crossref verification.'
  );

  const docId = Number(result.lastInsertRowid);

  const insertClaim = db.prepare(`
    INSERT INTO claims (
      document_id, claim_number, statement, citation_text, search_query,
      paper_title, paper_authors, paper_year, paper_venue, paper_doi, paper_url,
      paper_source_api, paper_abstract, relevant_passage, status, confidence,
      explanation, why_verdict, matching_points_json, mismatching_points_json, api_unavailable_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoClaims = [
    {
      claimNumber: 1,
      statement:
        'Slow-wave sleep plays a causal role in consolidating hippocampus-dependent declarative memories into neocortical networks via coordinated sharp-wave ripples.',
      citationText: '(Rasch & Born, 2013)',
      searchQuery: 'Rasch Born 2013 About sleep role in memory',
      paperTitle: "About sleep's role in memory",
      paperAuthors: 'Björn Rasch, Jan Born',
      paperYear: 2013,
      paperVenue: 'Physiological Reviews',
      paperDoi: '10.1152/physrev.00032.2012',
      paperUrl: 'https://doi.org/10.1152/physrev.00032.2012',
      paperSourceApi: 'DEMO DATA (Verified Reference)',
      paperAbstract:
        'Slow-wave sleep (SWS) facilitates the redistribution of temporarily stored hippocampal representations to neocortical long-term storage sites through system consolidation driven by slow oscillations, spindles, and sharp-wave ripples.',
      relevantPassage:
        'Slow-wave sleep (SWS) facilitates the redistribution of temporarily stored hippocampal representations to neocortical long-term storage sites through system consolidation driven by slow oscillations, spindles, and sharp-wave ripples.',
      status: 'SUPPORTED',
      confidence: 94,
      explanation:
        'The cited review directly establishes that slow-wave sleep supports active systems consolidation of hippocampus-dependent declarative memories into neocortical stores mediated by sharp-wave ripples and thalamocortical spindles.',
      whyVerdict:
        'Both the physiological mechanism (hippocampal-to-neocortical transfer via sharp-wave ripples) and the sleep stage (slow-wave sleep) match the cited review verbatim.',
      matchingPoints: [
        'Slow-wave sleep drives declarative memory consolidation',
        'Redistribution from hippocampus to neocortical networks',
        'Mediated by coordinated sharp-wave ripples',
      ],
      mismatchingPoints: [],
    },
    {
      claimNumber: 2,
      statement:
        'Targeted memory reactivation during REM sleep doubles overnight vocabulary recall performance across all adult age cohorts.',
      citationText: '(Schouten et al., 2017)',
      searchQuery: 'Schouten 2017 Targeted memory reactivation during sleep',
      paperTitle: 'State of the art on targeted memory reactivation: Your cues in my sleep',
      paperAuthors: 'D. I. Schouten, S. I. Pereira, M. Tops, J. W. Louzada',
      paperYear: 2017,
      paperVenue: 'Neuroscience & Biobehavioral Reviews',
      paperDoi: '10.1016/j.neubiorev.2016.07.018',
      paperUrl: 'https://doi.org/10.1016/j.neubiorev.2016.07.018',
      paperSourceApi: 'DEMO DATA (Verified Reference)',
      paperAbstract:
        'Targeted memory reactivation (TMR) shows consistent small-to-moderate memory benefits when auditory or olfactory cues are presented during NREM slow-wave sleep, whereas evidence for cueing during REM sleep remains mixed and highly task-dependent.',
      relevantPassage:
        'Targeted memory reactivation (TMR) shows consistent small-to-moderate memory benefits when auditory or olfactory cues are presented during NREM slow-wave sleep, whereas evidence for cueing during REM sleep remains mixed and highly task-dependent.',
      status: 'PARTIALLY_SUPPORTED',
      confidence: 82,
      explanation:
        'While Schouten et al. (2017) confirm that targeted memory reactivation enhances recall, the effect is documented primarily during NREM slow-wave sleep with small-to-moderate gains, not a universal doubling during REM sleep across all adult age groups.',
      whyVerdict:
        'The paper supports memory benefits from TMR, but the claim overstates the magnitude ("doubles") and misattributes the primary sleep stage (REM instead of NREM).',
      matchingPoints: [
        'Targeted memory reactivation can enhance recall performance',
      ],
      mismatchingPoints: [
        'Paper reports small-to-moderate gains, not a 2x (doubling) effect',
        'Strongest evidence is in NREM slow-wave sleep, whereas REM results are mixed',
        'No universal finding across all adult age cohorts',
      ],
    },
    {
      claimNumber: 3,
      statement:
        'Acoustic pink-noise stimulation completely eliminates amyloid-beta plaque deposition in Alzheimer’s patients within 14 days.',
      citationText: '(Ngo et al., 2013)',
      searchQuery: 'Ngo Martinetz Born Molle 2013 Auditory closed-loop stimulation',
      paperTitle: 'Auditory closed-loop stimulation of the sleep slow oscillation enhances memory',
      paperAuthors: 'Hong-Viet V. Ngo, Thomas Martinetz, Jan Born, Matthias Mölle',
      paperYear: 2013,
      paperVenue: 'Neuron',
      paperDoi: '10.1016/j.neuron.2013.03.006',
      paperUrl: 'https://doi.org/10.1016/j.neuron.2013.03.006',
      paperSourceApi: 'DEMO DATA (Verified Reference)',
      paperAbstract:
        'In healthy young adults, phase-locked auditory stimulation during slow-wave sleep increased slow oscillation amplitude and improved declarative word-pair retention the next morning.',
      relevantPassage:
        'In healthy young adults, phase-locked auditory stimulation during slow-wave sleep increased slow oscillation amplitude and improved declarative word-pair retention the next morning.',
      status: 'UNSUPPORTED',
      confidence: 91,
      explanation:
        'Ngo et al. (2013) investigated healthy young adults and measured slow oscillation enhancement and word-pair memory retention. The study did not examine Alzheimer’s disease patients or amyloid-beta plaque clearance.',
      whyVerdict:
        'The cited study measured memory retention in healthy volunteers and contains zero clinical data regarding Alzheimer’s pathology or amyloid-beta plaques.',
      matchingPoints: [
        'Uses auditory stimulation synchronized to slow oscillations during sleep',
      ],
      mismatchingPoints: [
        'Participants were healthy young adults, not Alzheimer’s patients',
        'Amyloid-beta plaque clearance was never measured in this study',
        '14-day clinical plaque elimination is completely absent from the source',
      ],
    },
    {
      claimNumber: 4,
      statement:
        'Sleep deprivation increases hippocampal neurogenesis and improves synaptic plasticity markers compared to rested controls.',
      citationText: '(Kreutzmann et al., 2015)',
      searchQuery: 'Kreutzmann Havekes Abel Meerlo 2015 Sleep deprivation hippocampal neurogenesis',
      paperTitle: 'Consequences of sleep deprivation and sleep restriction on adult hippocampal neurogenesis',
      paperAuthors: 'J. C. Kreutzmann, R. Havekes, T. Abel, P. Meerlo',
      paperYear: 2015,
      paperVenue: 'Neuroscience',
      paperDoi: '10.1016/j.neuroscience.2015.04.053',
      paperUrl: 'https://doi.org/10.1016/j.neuroscience.2015.04.053',
      paperSourceApi: 'DEMO DATA (Verified Reference)',
      paperAbstract:
        'Prolonged sleep deprivation suppresses cell proliferation and adult neurogenesis in the hippocampal dentate gyrus and impairs synaptic plasticity and hippocampal-dependent learning.',
      relevantPassage:
        'Prolonged sleep deprivation suppresses cell proliferation and adult neurogenesis in the hippocampal dentate gyrus and impairs synaptic plasticity and hippocampal-dependent learning.',
      status: 'CONTRADICTORY',
      confidence: 96,
      explanation:
        'The cited review concludes the exact opposite of the manuscript claim: prolonged sleep deprivation suppresses hippocampal neurogenesis and impairs synaptic plasticity rather than increasing or improving them.',
      whyVerdict:
        'The source paper explicitly states that sleep deprivation suppresses neurogenesis and impairs plasticity, directly contradicting the claim.',
      matchingPoints: [
        'Examines sleep deprivation effects on hippocampal neurogenesis and synaptic plasticity',
      ],
      mismatchingPoints: [
        'Claim says sleep deprivation increases neurogenesis; paper reports suppression',
        'Claim says synaptic plasticity improves; paper reports impairment',
      ],
    },
    {
      claimNumber: 5,
      statement:
        'REM sleep exclusively accounts for all emotional memory processing and operates independently of slow-wave sleep mechanisms.',
      citationText: '(Greenberg & Pearlman, 1974)',
      searchQuery: 'Greenberg Pearlman 1974 Cutting the REM nerve',
      paperTitle: 'Cutting the REM nerve: An approach to the adaptive role of REM sleep',
      paperAuthors: 'R. Greenberg, C. Pearlman',
      paperYear: 1974,
      paperVenue: 'Perspectives in Biology and Medicine',
      paperDoi: '10.1353/pbm.1974.0032',
      paperUrl: 'https://doi.org/10.1353/pbm.1974.0032',
      paperSourceApi: 'DEMO DATA (Verified Reference)',
      paperAbstract:
        'Early psychoanalytic and physiological synthesis proposing REM sleep as the primary adaptive state for emotional assimilation before modern neuroimaging and dual-process sleep models.',
      relevantPassage:
        'Early psychoanalytic and physiological synthesis proposing REM sleep as the primary adaptive state for emotional assimilation before modern neuroimaging and dual-process sleep models.',
      status: 'POSSIBLY_OUTDATED',
      confidence: 78,
      explanation:
        'This citation relies on a 1974 theoretical paper published over five decades ago. Contemporary sleep neuroscience demonstrates interactive contributions of both NREM slow-wave sleep and REM sleep to emotional memory consolidation.',
      whyVerdict:
        'The reference is from 1974 and predates modern polysomnography, fMRI, and dual-process models showing NREM and REM interaction.',
      matchingPoints: [
        'Historical work did emphasize REM sleep in emotional adaptation',
      ],
      mismatchingPoints: [
        'Published in 1974 (over 50 years old) and superseded by modern dual-stage models',
        'Modern consensus rejects exclusive REM-only emotional processing',
      ],
    },
  ];

  for (const c of demoClaims) {
    insertClaim.run(
      docId,
      c.claimNumber,
      c.statement,
      c.citationText,
      c.searchQuery,
      c.paperTitle,
      c.paperAuthors,
      c.paperYear,
      c.paperVenue,
      c.paperDoi,
      c.paperUrl,
      c.paperSourceApi,
      c.paperAbstract,
      c.relevantPassage,
      c.status,
      c.confidence,
      c.explanation,
      c.whyVerdict,
      JSON.stringify(c.matchingPoints),
      JSON.stringify(c.mismatchingPoints),
      null
    );
  }

  return docId;
}

export function saveAnalyzedDocument(input: {
  filename: string;
  fileSize: number;
  fileType: 'PDF' | 'DOCX' | 'TEXT';
  extractedTextPreview: string;
  analysisNotes: string | null;
  claims: Array<{
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
  }>;
}): DocumentRecord {
  const counts = {
    SUPPORTED: 0,
    PARTIALLY_SUPPORTED: 0,
    UNSUPPORTED: 0,
    CONTRADICTORY: 0,
    POSSIBLY_OUTDATED: 0,
    MANUAL_REVIEW: 0,
  };

  for (const c of input.claims) {
    counts[c.status] = (counts[c.status] || 0) + 1;
  }

  const flagged =
    counts.PARTIALLY_SUPPORTED +
    counts.UNSUPPORTED +
    counts.CONTRADICTORY +
    counts.POSSIBLY_OUTDATED;

  let overallStatus = 'Verified';
  if (input.claims.length === 0) {
    overallStatus = 'No Claims Detected';
  } else if (flagged === 0 && counts.MANUAL_REVIEW > 0) {
    overallStatus = 'Manual Review Needed';
  } else if (flagged > 0) {
    overallStatus = `Flagged (${flagged} ${flagged === 1 ? 'Issue' : 'Issues'})`;
  }

  const nowIso = new Date().toISOString();

  const tx = db.transaction(() => {
    const docRes = db
      .prepare(
        `INSERT INTO documents (
          filename, file_size, file_type, upload_date, extracted_text_preview,
          total_claims, supported_count, partially_supported_count, unsupported_count,
          contradictory_count, outdated_count, manual_review_count,
          overall_status, is_demo, analysis_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        input.filename,
        input.fileSize,
        input.fileType,
        nowIso,
        input.extractedTextPreview,
        input.claims.length,
        counts.SUPPORTED,
        counts.PARTIALLY_SUPPORTED,
        counts.UNSUPPORTED,
        counts.CONTRADICTORY,
        counts.POSSIBLY_OUTDATED,
        counts.MANUAL_REVIEW,
        overallStatus,
        input.analysisNotes
      );

    const docId = Number(docRes.lastInsertRowid);
    const insertClaim = db.prepare(`
      INSERT INTO claims (
        document_id, claim_number, statement, citation_text, search_query,
        paper_title, paper_authors, paper_year, paper_venue, paper_doi, paper_url,
        paper_source_api, paper_abstract, relevant_passage, status, confidence,
        explanation, why_verdict, matching_points_json, mismatching_points_json, api_unavailable_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of input.claims) {
      insertClaim.run(
        docId,
        c.claimNumber,
        c.statement,
        c.citationText,
        c.searchQuery,
        c.paperTitle,
        c.paperAuthors,
        c.paperYear,
        c.paperVenue,
        c.paperDoi,
        c.paperUrl,
        c.paperSourceApi,
        c.paperAbstract,
        c.relevantPassage,
        c.status,
        c.confidence,
        c.explanation,
        c.whyVerdict,
        JSON.stringify(c.matchingPoints),
        JSON.stringify(c.mismatchingPoints),
        c.apiUnavailableReason
      );
    }

    return docId;
  });

  const docId = tx();
  return getDocumentById(docId)!;
}

export function getAllDocuments(): DocumentRecord[] {
  const rows = db.prepare('SELECT * FROM documents ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  return rows.map(mapDocRow);
}

export function getDocumentById(id: number): DocumentRecord | null {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const doc = mapDocRow(row);
  const claimRows = db
    .prepare('SELECT * FROM claims WHERE document_id = ? ORDER BY claim_number ASC')
    .all(id) as Array<Record<string, unknown>>;
  doc.claims = claimRows.map(mapClaimRow);
  return doc;
}

export function deleteDocumentById(id: number): boolean {
  const res = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return res.changes > 0;
}

export function getDashboardStats(): DashboardStats {
  const docs = getAllDocuments();
  let totalClaimsVerified = 0;
  let supportedClaims = 0;
  let flaggedCitations = 0;
  const breakdown = {
    SUPPORTED: 0,
    PARTIALLY_SUPPORTED: 0,
    UNSUPPORTED: 0,
    CONTRADICTORY: 0,
    POSSIBLY_OUTDATED: 0,
    MANUAL_REVIEW: 0,
  };

  for (const d of docs) {
    totalClaimsVerified += d.totalClaims;
    supportedClaims += d.supportedCount;
    flaggedCitations +=
      d.partiallySupportedCount + d.unsupportedCount + d.contradictoryCount + d.outdatedCount;
    breakdown.SUPPORTED += d.supportedCount;
    breakdown.PARTIALLY_SUPPORTED += d.partiallySupportedCount;
    breakdown.UNSUPPORTED += d.unsupportedCount;
    breakdown.CONTRADICTORY += d.contradictoryCount;
    breakdown.POSSIBLY_OUTDATED += d.outdatedCount;
    breakdown.MANUAL_REVIEW += d.manualReviewCount;
  }

  return {
    totalDocuments: docs.length,
    totalClaimsVerified,
    supportedClaims,
    flaggedCitations,
    breakdown,
    recentDocuments: docs.slice(0, 8),
  };
}

export function getSettings(): WorkspaceSettings {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE id = 1').get() as Record<string, unknown>;
  return {
    researcherName: String(row.researcher_name),
    institution: String(row.institution),
    outdatedThresholdYears: Number(row.outdated_threshold_years),
    highlightPassages: Number(row.highlight_passages) === 1,
  };
}

export function updateSettings(next: Partial<WorkspaceSettings>): WorkspaceSettings {
  const current = getSettings();
  const merged: WorkspaceSettings = {
    researcherName: next.researcherName?.trim() || current.researcherName,
    institution: next.institution?.trim() || current.institution,
    outdatedThresholdYears:
      typeof next.outdatedThresholdYears === 'number' && next.outdatedThresholdYears >= 1
        ? Math.min(50, Math.round(next.outdatedThresholdYears))
        : current.outdatedThresholdYears,
    highlightPassages:
      typeof next.highlightPassages === 'boolean' ? next.highlightPassages : current.highlightPassages,
  };

  db.prepare(`
    UPDATE workspace_settings
    SET researcher_name = ?, institution = ?, outdated_threshold_years = ?, highlight_passages = ?
    WHERE id = 1
  `).run(
    merged.researcherName,
    merged.institution,
    merged.outdatedThresholdYears,
    merged.highlightPassages ? 1 : 0
  );

  return merged;
}
