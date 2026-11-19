import { GoogleGenAI, Type } from '@google/genai';
import type { VerificationStatus } from '../src/types.ts';
import type { RetrievedPaper } from './academicSearch.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add a valid Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth or invalid key errors
      if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export interface ExtractedClaim {
  claimNumber: number;
  statement: string;
  citationText: string;
  searchQuery: string;
}

export async function extractClaimsFromDocument(documentText: string): Promise<ExtractedClaim[]> {
  const ai = getGeminiClient();
  // Keep up to ~28,000 chars so both body claims and the References/Bibliography section fit
  const truncated =
    documentText.length > 28000
      ? `${documentText.slice(0, 18000)}\n\n[...MIDDLE TEXT OMITTED...]\n\n${documentText.slice(-10000)}`
      : documentText;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze the following academic document text and extract up to 8 key verifiable factual/scientific claims that are explicitly paired with an in-text citation or bibliographic reference.\n\nDocument Text:\n"""\n${truncated}\n"""`,
      config: {
        systemInstruction:
          'You are a rigorous scientific literature analyst. Extract only real claims that actually appear in the provided document text. Never invent claims or citations. For each claim, construct a clean academic searchQuery combining the cited authors, publication year, paper title (if present in references), and key topic words so Semantic Scholar and Crossref can locate the exact cited paper.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              statement: {
                type: Type.STRING,
                description: 'The verbatim or tightly faithful scientific claim sentence from the document.',
              },
              citationText: {
                type: Type.STRING,
                description: 'The exact in-text citation marker (e.g., "(Smith et al., 2020)" or "[4] + full reference if found").',
              },
              searchQuery: {
                type: Type.STRING,
                description: 'Concise search query for Semantic Scholar / Crossref (e.g. "Rasch Born 2013 sleep memory consolidation" or exact DOI/title).',
              },
            },
            required: ['statement', 'citationText', 'searchQuery'],
          },
        },
      },
    })
  );

  const raw = (response.text ?? '[]').trim();
  const parsed = JSON.parse(raw) as Array<{
    statement?: string;
    citationText?: string;
    searchQuery?: string;
  }>;

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item.statement && item.citationText)
    .slice(0, 8)
    .map((item, idx) => ({
      claimNumber: idx + 1,
      statement: String(item.statement).trim(),
      citationText: String(item.citationText).trim(),
      searchQuery: String(item.searchQuery || item.citationText).trim(),
    }));
}

export interface EvidenceVerificationResult {
  status: VerificationStatus;
  confidence: number;
  relevantPassage: string;
  explanation: string;
  whyVerdict: string;
  matchingPoints: string[];
  mismatchingPoints: string[];
}

export async function verifyClaimWithEvidence(
  claim: ExtractedClaim,
  paper: RetrievedPaper,
  outdatedThresholdYears: number
): Promise<EvidenceVerificationResult> {
  // If no paper or no abstract was retrieved, never fabricate evidence!
  if (!paper.found) {
    return {
      status: 'MANUAL_REVIEW',
      confidence: 0,
      relevantPassage: 'No source passage could be retrieved from Semantic Scholar or Crossref.',
      explanation:
        paper.apiError ||
        'The cited research paper could not be automatically located in Semantic Scholar or Crossref. Manual verification is required.',
      whyVerdict:
        'External academic APIs did not return a matching record for this citation, so automated evidence comparison was not possible.',
      matchingPoints: [],
      mismatchingPoints: ['Original paper metadata/abstract unavailable from academic APIs'],
    };
  }

  if (!paper.abstract || paper.abstract.trim().length < 25) {
    return {
      status: 'MANUAL_REVIEW',
      confidence: 20,
      relevantPassage:
        'Paper metadata was located, but the publisher did not expose an open abstract for automated text comparison.',
      explanation: `Matched "${paper.title || 'Unknown Title'}" (${paper.year ?? 'Year N/A'}) via ${paper.sourceApi}, but the abstract is unavailable or paywalled. Please inspect the linked publication directly.`,
      whyVerdict:
        'Bibliographic record exists, but no abstract text was available to compare against the claim.',
      matchingPoints: [
        paper.title ? `Matched publication record: ${paper.title}` : 'Matched bibliographic record',
      ],
      mismatchingPoints: ['Abstract text not exposed by publisher/API'],
    };
  }

  const ai = getGeminiClient();
  const currentYear = new Date().getFullYear();
  const paperAge = paper.year ? currentYear - paper.year : null;

  const prompt = `
Evaluate whether the retrieved research paper genuinely supports the claim made in the uploaded document.

CLAIM FROM DOCUMENT:
"${claim.statement}"

CITED AS:
"${claim.citationText}"

RETRIEVED RESEARCH PAPER (${paper.sourceApi}):
Title: ${paper.title || 'Unknown'}
Authors: ${paper.authors || 'Unknown'}
Year: ${paper.year ?? 'Unknown'}
Venue: ${paper.venue || 'Unknown'}
Paper Age: ${paperAge !== null ? `${paperAge} years old` : 'Unknown'} (Outdated threshold configured: ${outdatedThresholdYears} years)
Abstract / Evidence Text:
"""
${paper.abstract}
"""

Classification rules:
- SUPPORTED: The retrieved abstract clearly and directly substantiates the claim without overstatement.
- PARTIALLY_SUPPORTED: The retrieved paper supports part of the claim, but the claim overgeneralizes, exaggerates magnitude, omits key caveats, or shifts population/scope.
- UNSUPPORTED: The retrieved paper does not contain evidence for the claim (different topic, different outcome, or missing evidence).
- CONTRADICTORY: The retrieved paper states findings opposite to what the claim asserts.
- POSSIBLY_OUTDATED: Use when the paper is older than ${outdatedThresholdYears} years AND makes time-sensitive clinical, technological, or consensus assertions that may be superseded by newer research (unless it is purely citing a classic historical definition).
- MANUAL_REVIEW: Only if the retrieved paper appears to be a mismatching search result or lacks sufficient detail in the abstract to judge.

Be cautious and transparent: express uncertainty honestly in confidence (0-100) and never overstate certainty when judging from an abstract alone.
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an objective scientific peer-reviewer verifying citation integrity. Compare claims strictly against the provided abstract text. Extract an exact relevantPassage from the provided abstract without fabricating quotes.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: [
                'SUPPORTED',
                'PARTIALLY_SUPPORTED',
                'UNSUPPORTED',
                'CONTRADICTORY',
                'POSSIBLY_OUTDATED',
                'MANUAL_REVIEW',
              ],
            },
            confidence: {
              type: Type.INTEGER,
              description: 'Confidence score from 0 to 100 reflecting evidence alignment clarity.',
            },
            relevantPassage: {
              type: Type.STRING,
              description: 'Verbatim excerpt from the retrieved abstract most relevant to evaluating the claim.',
            },
            explanation: {
              type: Type.STRING,
              description: 'Detailed 2-3 sentence scholarly comparison explaining how the abstract aligns or diverges from the claim.',
            },
            whyVerdict: {
              type: Type.STRING,
              description: 'Simple, plain-language 1-2 sentence explanation for the Why This Verdict panel.',
            },
            matchingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific aspects of the claim supported by the retrieved evidence.',
            },
            mismatchingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific discrepancies, exaggerations, missing evidence, or contradictions.',
            },
          },
          required: [
            'status',
            'confidence',
            'relevantPassage',
            'explanation',
            'whyVerdict',
            'matchingPoints',
            'mismatchingPoints',
          ],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as Partial<EvidenceVerificationResult>;

  const validStatuses: VerificationStatus[] = [
    'SUPPORTED',
    'PARTIALLY_SUPPORTED',
    'UNSUPPORTED',
    'CONTRADICTORY',
    'POSSIBLY_OUTDATED',
    'MANUAL_REVIEW',
  ];

  const status: VerificationStatus = validStatuses.includes(parsed.status as VerificationStatus)
    ? (parsed.status as VerificationStatus)
    : 'MANUAL_REVIEW';

  return {
    status,
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence ?? 50))),
    relevantPassage: String(parsed.relevantPassage || paper.abstract).trim(),
    explanation: String(parsed.explanation || 'Verification completed against retrieved abstract.').trim(),
    whyVerdict: String(parsed.whyVerdict || 'Comparison performed between claim and retrieved abstract.').trim(),
    matchingPoints: Array.isArray(parsed.matchingPoints) ? parsed.matchingPoints.map(String) : [],
    mismatchingPoints: Array.isArray(parsed.mismatchingPoints) ? parsed.mismatchingPoints.map(String) : [],
  };
}
