# CiteVerify 2.0

> Scientific claim and citation verification: check whether the papers an academic document cites actually support its claims.

Built for the **INNOVEDGE Hackathon 2026** (Problem Statement 03).

## The Problem
References in reports and research papers can be incorrect, outdated or unrelated to the statement they support. Even a genuine paper may not prove the claim being made. Checking every citation by hand is slow, so unsupported claims slip through.

## What CiteVerify Does
Upload a research paper (PDF or DOCX) and get a claim-by-claim verification report.

- **Claim and citation extraction:** finds verifiable statements and pairs each with its in-text citation
- **Original paper retrieval:** looks up cited papers through Semantic Scholar and Crossref (title, authors, year, venue, DOI, abstract)
- **Side-by-side evidence comparison:** shows the claim next to the source evidence, with matching and mismatching points
- **Verdicts with reasons:** each claim gets a status, a confidence indicator and a plain-language "Why This Verdict?" explanation
- **Live progress tracking:** follow the analysis from text extraction to the final verdicts
- **Dashboard and charts:** verification breakdowns as doughnut, bar and pie charts
- **Verification history:** revisit past analyses
- **PDF report export:** download a multi-page report with summary metrics, verdicts and paper references
- **Settings:** researcher profile, institution and an "outdated citation" year threshold

## How It Works
1. **Upload** a research paper or document
2. **Extract** claims, citations and references
3. **Retrieve** the original cited papers
4. **Compare** each claim against the source
5. **Report** verdicts, evidence and links

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Chart.js, jsPDF, Lucide React |
| **Backend** | Node.js, Express, Multer (PDF/DOCX uploads up to 15 MB), background job tracker |
| **Text extraction** | `unpdf` (PDF), `mammoth` (DOCX) |
| **AI engine** | Google Gemini API (`@google/genai`), run server-side with structured JSON output |
| **Paper retrieval** | Semantic Scholar Graph API, Crossref Works API |
| **Database** | SQLite (`better-sqlite3`) |

**AI tasks:**
1. **Claim and citation extraction:** finds verifiable statements and pairs each with its in-text citation
2. **Evidence comparison:** compares each claim with the retrieved abstract and assigns a verdict, a confidence indicator and a plain-language explanation

**Verdicts:** Supported, Partially Supported, Unsupported, Contradictory, Possibly Outdated, Manual Review

If a paper's abstract is paywalled or unavailable, the claim is marked **Manual Review** instead of inventing evidence.

## Run Locally
**Prerequisites:** Node.js and a [Gemini API key](https://aistudio.google.com/apikey)

```bash
git clone https://github.com/meghana-s-2007/CiteVerify2.0.git
cd CiteVerify2.0
npm install
```

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

Start the app:

```bash
npm run dev
```

## Limitations
- Verdicts depend on the AI model and the source text it can access
- Confidence indicators show uncertainty, not a guarantee

## Team
Built by Team MergeX for INNOVEDGE Hackathon 2026.

- Meghana S: role, Backend, Deploying
- Megha A M: role, Backend, Research Papers
- Mohammad Hana: role, Frontend, PPT 

Software Engineering students, Sapthagiri NPS University
