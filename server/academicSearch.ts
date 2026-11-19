export interface RetrievedPaper {
  found: boolean;
  title: string | null;
  authors: string | null;
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  sourceApi: 'Semantic Scholar' | 'Crossref' | null;
  apiError: string | null;
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CiteVerify/1.0 (mailto:research-integrity@citeverify.org)',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function searchSemanticScholar(query: string): Promise<{ paper: RetrievedPaper | null; error: string | null }> {
  const cleanQuery = query.trim().slice(0, 220);
  if (!cleanQuery) return { paper: null, error: 'Empty search query' };

  const url =
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(cleanQuery)}` +
    `&limit=3&fields=title,authors,year,abstract,venue,externalIds,url,openAccessPdf`;

  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 429) {
      return { paper: null, error: 'Semantic Scholar API rate limit reached (HTTP 429).' };
    }
    if (!res.ok) {
      return { paper: null, error: `Semantic Scholar API returned HTTP ${res.status}.` };
    }
    const data = (await res.json()) as {
      data?: Array<{
        paperId?: string;
        title?: string;
        year?: number;
        venue?: string;
        abstract?: string;
        url?: string;
        authors?: Array<{ name?: string }>;
        externalIds?: { DOI?: string; ArXiv?: string; PubMed?: string };
        openAccessPdf?: { url?: string };
      }>;
    };

    const items = data.data || [];
    if (items.length === 0) {
      return { paper: null, error: null };
    }

    // Prefer a candidate that includes an abstract so evidence comparison is grounded
    const best = items.find((item) => Boolean(item.abstract && item.abstract.trim().length > 30)) || items[0];
    const doi = best.externalIds?.DOI || null;
    const resolvedUrl =
      best.openAccessPdf?.url ||
      (doi ? `https://doi.org/${doi}` : null) ||
      best.url ||
      (best.paperId ? `https://www.semanticscholar.org/paper/${best.paperId}` : null);

    return {
      paper: {
        found: true,
        title: best.title || null,
        authors: best.authors?.map((a) => a.name).filter(Boolean).join(', ') || null,
        year: typeof best.year === 'number' ? best.year : null,
        venue: best.venue || null,
        doi,
        url: resolvedUrl,
        abstract: best.abstract ? best.abstract.trim() : null,
        sourceApi: 'Semantic Scholar',
        apiError: null,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { paper: null, error: `Semantic Scholar request failed: ${message}` };
  }
}

async function searchCrossrefByDoi(doi: string): Promise<{ paper: RetrievedPaper | null; error: string | null }> {
  const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
  const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { paper: null, error: `Crossref DOI lookup returned HTTP ${res.status}.` };
    }
    const payload = (await res.json()) as {
      message?: {
        title?: string[];
        author?: Array<{ given?: string; family?: string }>;
        published?: { 'date-parts'?: number[][] };
        'published-print'?: { 'date-parts'?: number[][] };
        'published-online'?: { 'date-parts'?: number[][] };
        'container-title'?: string[];
        DOI?: string;
        URL?: string;
        abstract?: string;
      };
    };
    const work = payload.message;
    if (!work) return { paper: null, error: null };

    const year =
      work.published?.['date-parts']?.[0]?.[0] ||
      work['published-print']?.['date-parts']?.[0]?.[0] ||
      work['published-online']?.['date-parts']?.[0]?.[0] ||
      null;

    const authors =
      work.author
        ?.map((a) => [a.given, a.family].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ') || null;

    return {
      paper: {
        found: true,
        title: work.title?.[0] || null,
        authors,
        year: typeof year === 'number' ? year : null,
        venue: work['container-title']?.[0] || null,
        doi: work.DOI || cleanDoi,
        url: work.URL || `https://doi.org/${work.DOI || cleanDoi}`,
        abstract: work.abstract ? stripHtmlTags(work.abstract) : null,
        sourceApi: 'Crossref',
        apiError: null,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { paper: null, error: `Crossref DOI request failed: ${message}` };
  }
}

async function searchCrossref(query: string): Promise<{ paper: RetrievedPaper | null; error: string | null }> {
  const cleanQuery = query.trim().slice(0, 220);
  if (!cleanQuery) return { paper: null, error: 'Empty search query' };

  const url = `https://api.crossref.org/works?query=${encodeURIComponent(cleanQuery)}&rows=3`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { paper: null, error: `Crossref API returned HTTP ${res.status}.` };
    }
    const data = (await res.json()) as {
      message?: {
        items?: Array<{
          title?: string[];
          author?: Array<{ given?: string; family?: string }>;
          published?: { 'date-parts'?: number[][] };
          'published-print'?: { 'date-parts'?: number[][] };
          'published-online'?: { 'date-parts'?: number[][] };
          'container-title'?: string[];
          DOI?: string;
          URL?: string;
          abstract?: string;
        }>;
      };
    };

    const items = data.message?.items || [];
    if (items.length === 0) return { paper: null, error: null };

    const best = items.find((i) => Boolean(i.abstract)) || items[0];
    const year =
      best.published?.['date-parts']?.[0]?.[0] ||
      best['published-print']?.['date-parts']?.[0]?.[0] ||
      best['published-online']?.['date-parts']?.[0]?.[0] ||
      null;

    const authors =
      best.author
        ?.map((a) => [a.given, a.family].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ') || null;

    return {
      paper: {
        found: true,
        title: best.title?.[0] || null,
        authors,
        year: typeof year === 'number' ? year : null,
        venue: best['container-title']?.[0] || null,
        doi: best.DOI || null,
        url: best.URL || (best.DOI ? `https://doi.org/${best.DOI}` : null),
        abstract: best.abstract ? stripHtmlTags(best.abstract) : null,
        sourceApi: 'Crossref',
        apiError: null,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { paper: null, error: `Crossref request failed: ${message}` };
  }
}

export async function retrieveResearchPaper(
  searchQuery: string,
  citationText: string
): Promise<RetrievedPaper> {
  // 1. Check for explicit DOI in citation or query
  const doiMatch = `${citationText} ${searchQuery}`.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i);
  if (doiMatch) {
    const doiLookup = await searchCrossrefByDoi(doiMatch[0]);
    if (doiLookup.paper) {
      // If Crossref lacks an abstract, try Semantic Scholar for the abstract using the title
      if (!doiLookup.paper.abstract && doiLookup.paper.title) {
        const s2 = await searchSemanticScholar(doiLookup.paper.title);
        if (s2.paper?.abstract) {
          doiLookup.paper.abstract = s2.paper.abstract;
          doiLookup.paper.sourceApi = 'Semantic Scholar';
        }
      }
      return doiLookup.paper;
    }
  }

  // 2. Query Semantic Scholar first (provides rich abstracts + openAccessPdf)
  const s2Result = await searchSemanticScholar(searchQuery);
  if (s2Result.paper && s2Result.paper.abstract) {
    return s2Result.paper;
  }

  // 3. Fallback / supplement with Crossref
  const crResult = await searchCrossref(searchQuery);
  if (crResult.paper) {
    if (!crResult.paper.abstract && s2Result.paper) {
      return s2Result.paper;
    }
    return crResult.paper;
  }

  if (s2Result.paper) {
    return s2Result.paper;
  }

  const errors = [s2Result.error, crResult.error].filter(Boolean);
  return {
    found: false,
    title: null,
    authors: null,
    year: null,
    venue: null,
    doi: null,
    url: null,
    abstract: null,
    sourceApi: null,
    apiError:
      errors.length > 0
        ? errors.join(' | ')
        : 'No matching peer-reviewed paper was returned by Semantic Scholar or Crossref for this citation.',
  };
}
