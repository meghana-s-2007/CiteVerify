import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileSearch,
  FileText,
  GitCompareArrows,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onEnterWorkspace: (targetView?: 'dashboard' | 'upload') => void;
  researcherName: string;
  onUpdateResearcher: (name: string, institution: string) => void;
}

const HERO_IMG = '/src/assets/images/hero_citeverify_research_1795103956161.jpg';
const ABOUT_IMG = '/src/assets/images/about_academic_integrity_1795103956573.jpg';

const FEATURES = [
  {
    num: '01',
    title: 'Intelligent Claim Extraction',
    summary:
      'Parses uploaded PDF and DOCX manuscripts to isolate factual, statistical, and causal statements paired with their exact in-text citations.',
    span: 'lg:col-span-2',
    icon: FileSearch,
  },
  {
    num: '02',
    title: 'Citation Matching',
    summary:
      'Resolves parenthetical, numeric, and bibliography entries into clean author, year, title, and DOI search signatures.',
    span: 'lg:col-span-1',
    icon: BookOpenCheck,
  },
  {
    num: '03',
    title: 'Research Paper Retrieval',
    summary:
      'Queries Semantic Scholar and Crossref APIs live to fetch authoritative titles, publication years, venues, DOIs, and abstracts.',
    span: 'lg:col-span-1',
    icon: FileText,
  },
  {
    num: '04',
    title: 'Evidence Comparison',
    summary:
      'Places the original manuscript claim side-by-side against the retrieved research passage with matching and mismatching highlights.',
    span: 'lg:col-span-2',
    icon: GitCompareArrows,
  },
  {
    num: '05',
    title: 'AI-Powered Verification',
    summary:
      'Classifies each citation as Supported, Partially Supported, Unsupported, Contradictory, or Possibly Outdated with confidence indicators.',
    span: 'lg:col-span-1',
    icon: Scale,
  },
  {
    num: '06',
    title: 'Verification Reports',
    summary:
      'Compiles interactive summary charts, claim-by-claim explanations, and downloadable PDF audit reports for peer review.',
    span: 'lg:col-span-2',
    icon: ShieldCheck,
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Upload your document',
    detail: 'Drop a scholarly PDF or DOCX manuscript into the verification workspace.',
  },
  {
    step: '02',
    title: 'Extract claims and citations',
    detail: 'Full document text is parsed to isolate verifiable claims and linked references.',
  },
  {
    step: '03',
    title: 'Retrieve original research papers',
    detail: 'Semantic Scholar and Crossref locate bibliographic records and source abstracts.',
  },
  {
    step: '04',
    title: 'Compare claims with evidence',
    detail: 'Side-by-side semantic comparison checks whether the cited source supports the statement.',
  },
  {
    step: '05',
    title: 'Generate verification results',
    detail: 'Review flagged citations, inspect passages, and export a formal PDF audit report.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  researcherName,
  onUpdateResearcher,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [aboutImgFailed, setAboutImgFailed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [nameInput, setNameInput] = useState(researcherName);
  const [institutionInput, setInstitutionInput] = useState('Center for Scientific Integrity');
  const [formError, setFormError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFormError('Please enter your researcher name to continue.');
      return;
    }
    setFormError('');
    onUpdateResearcher(nameInput.trim(), institutionInput.trim() || 'Academic Research Lab');
    setLoginOpen(false);
    onEnterWorkspace('dashboard');
  };

  return (
    <div id="home" className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#home"
            className="font-display text-xl font-extrabold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
          >
            CiteVerify
          </a>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#home"
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#features"
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#about"
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="hover:text-slate-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onEnterWorkspace('dashboard')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-14 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-700 mb-3">
              Scientific Claim and Citation Verification System
            </p>
            <h1
              className="font-display font-extrabold tracking-tight text-slate-950 leading-[1.08]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)', textWrap: 'balance' }}
            >
              Your Citations Deserve Verification.
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
              An intelligent platform that checks whether scientific research actually supports the
              claims made in your academic documents. Don&apos;t just cite it. Verify it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onEnterWorkspace('upload')}
                className="inline-flex items-center gap-2.5 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Verification
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Features
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>Semantic Scholar &amp; Crossref retrieval</span>
              <span aria-hidden="true">·</span>
              <span>PDF &amp; DOCX manuscript parsing</span>
              <span aria-hidden="true">·</span>
              <span>Side-by-side passage audit</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] lg:min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMG}
                  alt="Printed scientific journals under an optical verification lens"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-200 p-8 text-center">
                  <BookOpenCheck className="h-12 w-12 text-slate-700 mb-3" />
                  <p className="font-display text-lg font-semibold text-slate-900">
                    Evidence-First Academic Verification
                  </p>
                  <p className="mt-1 text-sm text-slate-600 max-w-sm">
                    Cross-referencing manuscript claims against peer-reviewed literature.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4-column Capability Strip below Hero Split */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl bg-slate-50/60 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <div className="font-display text-2xl font-bold text-slate-950 tabular-nums">5 Verdicts</div>
            <p className="mt-1 text-sm text-slate-600">
              Supported, Partial, Unsupported, Contradictory, Outdated
            </p>
          </div>
          <div className="p-5">
            <div className="font-display text-2xl font-bold text-slate-950 tabular-nums">200M+</div>
            <p className="mt-1 text-sm text-slate-600">
              Scholarly records indexed via Semantic Scholar &amp; Crossref
            </p>
          </div>
          <div className="p-5">
            <div className="font-display text-2xl font-bold text-slate-950 tabular-nums">PDF / DOCX</div>
            <p className="mt-1 text-sm text-slate-600">
              Direct full-text extraction for academic manuscripts
            </p>
          </div>
          <div className="p-5">
            <div className="font-display text-2xl font-bold text-slate-950 tabular-nums">Audit PDF</div>
            <p className="mt-1 text-sm text-slate-600">
              Exportable claim-by-claim integrity report with DOIs
            </p>
          </div>
        </div>
      </section>

      {/* Features Section — Asymmetric Bento Grid */}
      <section id="features" className="border-t border-slate-200 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-indigo-700">Core Capabilities</p>
            <h2
              className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950"
              style={{ textWrap: 'balance' }}
            >
              Built to verify evidence, not merely reference formatting
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Standard bibliography checkers only confirm whether a citation string looks valid.
              CiteVerify inspects the underlying research abstract to evaluate whether the cited
              paper actually substantiates the statement.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <article
                  key={feat.num}
                  className={`${feat.span} rounded-xl border border-slate-200 bg-white p-7 transition-colors hover:border-indigo-300`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-indigo-700 tabular-nums">
                      {feat.num}
                    </span>
                    <Icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold text-slate-950">
                    {feat.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{feat.summary}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — 5-Step Workflow */}
      <section id="how-it-works" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-indigo-700">Verification Pipeline</p>
              <h2
                className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950"
                style={{ textWrap: 'balance' }}
              >
                Five steps from manuscript upload to evidence audit
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onEnterWorkspace('upload')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Upload a Document
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6">
            {WORKFLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-indigo-700 tabular-nums">
                    Step {item.step}
                  </span>
                  <h3 className="mt-3 font-display text-base font-bold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="border-t border-slate-200 bg-slate-50/70 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white aspect-[4/3]">
                {!aboutImgFailed ? (
                  <img
                    src={ABOUT_IMG}
                    alt="University research study table with bound peer-reviewed volumes"
                    referrerPolicy="no-referrer"
                    onError={() => setAboutImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 p-8 text-slate-600">
                    Academic Research Integrity
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <p className="text-sm font-semibold text-indigo-700">About CiteVerify</p>
              <h2
                className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950"
                style={{ textWrap: 'balance' }}
              >
                Protecting academic rigor in an era of automated writing
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Citation distortion—where a paper is cited to support a claim it never made, or
                even contradicts—undermines peer review and scientific reproducibility. CiteVerify
                equips students, researchers, thesis committees, and journal reviewers with rapid
                evidence alignment checks against primary literature metadata.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Every verdict surfaces the exact retrieved passage alongside an explicit confidence
                indicator and external DOI link. CiteVerify treats AI analysis as transparent
                decision support—never guaranteed scholarly truth—ensuring human researchers stay in
                command of final judgment.
              </p>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Transparent Uncertainty</p>
                    <p className="text-sm text-slate-600">
                      Flags paywalled or missing abstracts for manual review instead of guessing.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Persistent Audit Trail</p>
                    <p className="text-sm text-slate-600">
                      Saves every analyzed manuscript and claim verdict in local SQLite history.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Professional Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-lg font-extrabold text-slate-950">CiteVerify</p>
            <p className="mt-1 text-sm text-slate-500">
              Don&apos;t just cite it. Verify it. — Scientific Claim &amp; Citation Verification System
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-950 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">
              How It Works
            </a>
            <a href="#about" className="hover:text-slate-950 transition-colors">
              About
            </a>
            <button
              type="button"
              onClick={() => onEnterWorkspace('dashboard')}
              className="font-semibold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </footer>

      {/* Researcher Sign-In Modal */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="login-modal-title" className="font-display text-xl font-bold text-slate-950">
                Researcher Workspace Access
              </h2>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Close sign in dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Personalize your session profile for verification reports and document history.
            </p>

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-name" className="block text-sm font-medium text-slate-800">
                  Researcher Name
                </label>
                <input
                  id="login-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Dr. Elena Vance"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label htmlFor="login-inst" className="block text-sm font-medium text-slate-800">
                  Institution / Department
                </label>
                <input
                  id="login-inst"
                  type="text"
                  value={institutionInput}
                  onChange={(e) => setInstitutionInput(e.target.value)}
                  placeholder="Department of Biomedical Sciences"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {formError && <p className="text-sm text-red-700">{formError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLoginOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Enter Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
