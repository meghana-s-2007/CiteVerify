import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  deleteDocumentById,
  getAllDocuments,
  getDashboardStats,
  getDocumentById,
  getSettings,
  insertDemoDocument,
  saveAnalyzedDocument,
  seedDemoDocumentIfEmpty,
  updateSettings,
} from './server/db.ts';
import { extractDocumentText } from './server/extractor.ts';
import { retrieveResearchPaper } from './server/academicSearch.ts';
import { extractClaimsFromDocument, verifyClaimWithEvidence } from './server/gemini.ts';
import type { AnalysisJob } from './src/types.ts';

seedDemoDocumentIfEmpty();

const app = express();
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
});

const jobs = new Map<string, AnalysisJob>();

function setJob(jobId: string, patch: Partial<AnalysisJob>) {
  const existing = jobs.get(jobId) || {
    jobId,
    status: 'queued',
    progress: 0,
    message: 'Queued for processing...',
  };
  jobs.set(jobId, { ...existing, ...patch });
}

const SAMPLE_LIVE_MANUSCRIPT = `
Title: Large Language Models and Retrieval-Augmented Verification in Biomedical Literature

1. Introduction
Transformer-based architectures have transformed natural language processing by replacing recurrent sequence processing with self-attention mechanisms, enabling parallelized training across long contexts (Vaswani et al., 2017). In biomedical text mining, domain-specific pretraining on PubMed abstracts significantly improves named entity recognition and relation extraction compared to general-domain BERT models (Lee et al., 2020).

2. Clinical Reliability and Citation Drift
Despite rapid progress, retrieval-augmented generation models still generate unsupported medical assertions when source abstracts are absent or truncated (Lewis et al., 2020). Furthermore, recent clinical evaluations claim that Attention Is All You Need proved transformers eliminate all diagnostic errors in radiology imaging (Vaswani et al., 2017). Additionally, early rule-based expert systems such as MYCIN remain the primary standard deployed in modern hospital intensive care units worldwide (Shortliffe, 1976).

References:
- Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention Is All You Need. Advances in Neural Information Processing Systems (NeurIPS). DOI: 10.48550/arXiv.1706.03762
- Lee, J., Yoon, W., Kim, S., Kim, D., Kim, S., So, C. H., & Kang, J. (2020). BioBERT: a pre-trained biomedical language representation model for biomedical text mining. Bioinformatics, 36(4), 1234-1240. DOI: 10.1093/bioinformatics/btz682
- Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ... & Kiela, D. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. NeurIPS. DOI: 10.48550/arXiv.2005.11401
- Shortliffe, E. H. (1976). Computer-Based Medical Consultations: MYCIN. Elsevier.
`;

async function runVerificationPipeline(
  jobId: string,
  input: {
    filename: string;
    fileSize: number;
    fileType: 'PDF' | 'DOCX' | 'TEXT';
    rawBuffer?: Buffer;
    mimetype?: string;
    directText?: string;
  }
): Promise<void> {
  try {
    let extractedText = input.directText || '';
    let detectedType: 'PDF' | 'DOCX' | 'TEXT' = input.fileType;

    if (input.rawBuffer) {
      setJob(jobId, {
        status: 'extracting_text',
        progress: 15,
        message: `Extracting text from ${input.filename}...`,
      });
      const extracted = await extractDocumentText(
        input.rawBuffer,
        input.filename,
        input.mimetype || ''
      );
      extractedText = extracted.text;
      detectedType = extracted.fileType;
    }

    setJob(jobId, {
      status: 'extracting_claims',
      progress: 35,
      message: 'Identifying scientific claims and associated citations with Gemini...',
    });

    const extractedClaims = await extractClaimsFromDocument(extractedText);

    if (extractedClaims.length === 0) {
      const saved = saveAnalyzedDocument({
        filename: input.filename,
        fileSize: input.fileSize,
        fileType: detectedType,
        extractedTextPreview: extractedText.slice(0, 600),
        analysisNotes:
          'No explicit scientific claims paired with citations were detected in the uploaded text.',
        claims: [],
      });
      setJob(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Analysis complete (no cited claims detected).',
        documentId: saved.id,
      });
      return;
    }

    const settings = getSettings();
    const verifiedClaims = [];

    for (let i = 0; i < extractedClaims.length; i++) {
      const claim = extractedClaims[i];
      const baseProgress = 45 + Math.round((i / extractedClaims.length) * 48);

      setJob(jobId, {
        status: 'retrieving_papers',
        progress: baseProgress,
        message: `Retrieving research paper for claim ${i + 1} of ${extractedClaims.length} via Semantic Scholar & Crossref...`,
      });

      const paper = await retrieveResearchPaper(claim.searchQuery, claim.citationText);

      setJob(jobId, {
        status: 'verifying_evidence',
        progress: Math.min(95, baseProgress + Math.round(24 / extractedClaims.length)),
        message: `Comparing claim ${i + 1} of ${extractedClaims.length} against retrieved evidence...`,
      });

      const verdict = await verifyClaimWithEvidence(
        claim,
        paper,
        settings.outdatedThresholdYears
      );

      verifiedClaims.push({
        claimNumber: claim.claimNumber,
        statement: claim.statement,
        citationText: claim.citationText,
        searchQuery: claim.searchQuery,
        paperTitle: paper.title,
        paperAuthors: paper.authors,
        paperYear: paper.year,
        paperVenue: paper.venue,
        paperDoi: paper.doi,
        paperUrl: paper.url,
        paperSourceApi: paper.sourceApi,
        paperAbstract: paper.abstract,
        relevantPassage: verdict.relevantPassage,
        status: verdict.status,
        confidence: verdict.confidence,
        explanation: verdict.explanation,
        whyVerdict: verdict.whyVerdict,
        matchingPoints: verdict.matchingPoints,
        mismatchingPoints: verdict.mismatchingPoints,
        apiUnavailableReason: paper.apiError,
      });
    }

    const apiWarnings = verifiedClaims
      .map((c) => c.apiUnavailableReason)
      .filter((r): r is string => Boolean(r));

    const saved = saveAnalyzedDocument({
      filename: input.filename,
      fileSize: input.fileSize,
      fileType: detectedType,
      extractedTextPreview: extractedText.slice(0, 600),
      analysisNotes:
        apiWarnings.length > 0
          ? `Note: ${apiWarnings.length} citation(s) encountered external lookup limits or missing abstracts and were marked for manual review.`
          : 'All claims extracted and evaluated against retrieved academic metadata and abstracts.',
      claims: verifiedClaims,
    });

    setJob(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Verification complete.',
      documentId: saved.id,
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Unexpected analysis error';
    let friendly = rawMsg;
    if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED')) {
      friendly =
        'Gemini API key error (invalid or missing permissions). Please verify your GEMINI_API_KEY in Settings > Secrets.';
    } else if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
      friendly =
        'Gemini API quota limit reached (429). Please retry shortly or check your API quota.';
    }
    setJob(jobId, {
      status: 'failed',
      progress: 100,
      message: friendly,
      error: friendly,
    });
  }
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CiteVerify API' });
});

app.get('/api/dashboard', (_req, res) => {
  try {
    res.json(getDashboardStats());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load dashboard' });
  }
});

app.get('/api/documents', (_req, res) => {
  try {
    res.json(getAllDocuments());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list documents' });
  }
});

app.get('/api/documents/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Invalid document ID' });
    return;
  }
  const doc = getDocumentById(id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

app.delete('/api/documents/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: 'Invalid document ID' });
    return;
  }
  const deleted = deleteDocumentById(id);
  if (!deleted) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ deleted: true });
});

app.post('/api/analyze', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please select a PDF or DOCX document.' });
    return;
  }

  const lower = req.file.originalname.toLowerCase();
  if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
    res.status(400).json({
      error: 'Unsupported file extension. Only .pdf and .docx academic manuscripts are accepted.',
    });
    return;
  }

  const jobId = randomUUID();
  setJob(jobId, {
    status: 'queued',
    progress: 5,
    message: 'Document received. Starting text extraction...',
  });

  void runVerificationPipeline(jobId, {
    filename: req.file.originalname,
    fileSize: req.file.size,
    fileType: lower.endsWith('.pdf') ? 'PDF' : 'DOCX',
    rawBuffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  res.status(202).json({ jobId });
});

app.post('/api/analyze-sample', (_req, res) => {
  const jobId = randomUUID();
  setJob(jobId, {
    status: 'queued',
    progress: 8,
    message: 'Preparing live sample manuscript for real Gemini & Semantic Scholar/Crossref verification...',
  });

  void runVerificationPipeline(jobId, {
    filename: 'Live_Sample_LLM_Biomedical_Verification.docx',
    fileSize: Buffer.byteLength(SAMPLE_LIVE_MANUSCRIPT, 'utf8'),
    fileType: 'DOCX',
    directText: SAMPLE_LIVE_MANUSCRIPT,
  });

  res.status(202).json({ jobId });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Analysis job not found or expired.' });
    return;
  }
  res.json(job);
});

app.get('/api/settings', (_req, res) => {
  res.json(getSettings());
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = updateSettings(req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update settings' });
  }
});

app.post('/api/demo/restore', (_req, res) => {
  const id = insertDemoDocument();
  res.json({ documentId: id });
});

// Multer error handler
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File size exceeds the 15 MB limit.' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CiteVerify server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
