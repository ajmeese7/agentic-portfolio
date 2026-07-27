/**
 * The meese.rs writing catalog, fetched from that site's /index.json.
 *
 * meese.rs is the static publisher and this is the consumer: it holds what
 * Aaron has actually written, so the clone can point at a real post instead of
 * paraphrasing the profile at someone. The contract is documented in that
 * repo's src/utils/catalog.ts; treat the shape here as read-only.
 *
 * Degrading is the design. A blog that is down, slow, or serving a shape we do
 * not recognize must never take the chat with it, so every failure path here
 * ends in `null` and the caller falls back to profile-only grounding.
 */

/** The catalog version this consumer understands. */
export const SUPPORTED_VERSION = 1;

const DEFAULT_INDEX_URL = "https://meese.rs/index.json";

/** Long enough for a cold edge hit, short enough that chat never visibly stalls. */
const FETCH_TIMEOUT_MS = 3_000;

/**
 * A new post becomes citable within an hour of the meese.rs deploy. Unrelated
 * to that site's hourly newsletter cron; this is just memoization so a burst of
 * chat turns does not refetch the same file every message.
 */
const TTL_MS = 60 * 60 * 1_000;

export interface WritingEntry {
  slug: string;
  title: string;
  description: string;
  url: string;
  date: string;
  type: string;
  topics: string[];
  tags: string[];
  repo?: string;
}

export interface WritingIndex {
  version: number;
  count: number;
  entries: WritingEntry[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(isNonEmptyString) : [];
}

/**
 * Narrow one raw item, or `null` if it is missing anything the prompt needs.
 * A single malformed entry is dropped rather than failing the whole catalog:
 * losing one post beats losing every post.
 */
function parseEntry(raw: unknown): WritingEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    !isNonEmptyString(o.slug) ||
    !isNonEmptyString(o.title) ||
    !isNonEmptyString(o.description) ||
    !isNonEmptyString(o.url) ||
    !isNonEmptyString(o.date) ||
    !isNonEmptyString(o.type)
  ) {
    return null;
  }
  return {
    slug: o.slug,
    title: o.title,
    description: o.description,
    url: o.url,
    date: o.date,
    type: o.type,
    topics: stringList(o.topics),
    tags: stringList(o.tags),
    ...(isNonEmptyString(o.repo) ? { repo: o.repo } : {}),
  };
}

/**
 * Validate a parsed /index.json payload. Pure, so the contract is testable
 * without a network.
 *
 * An unrecognized `version` logs and returns null on purpose: the two repos
 * deploy independently, so a shape change that slipped through would otherwise
 * be indistinguishable from the blog being down, and the clone would quietly
 * stop citing anything forever.
 */
export function parseWritingIndex(payload: unknown): WritingIndex | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;

  if (o.version !== SUPPORTED_VERSION) {
    console.warn(
      `writing-index: got catalog version ${String(o.version)}, expected ${SUPPORTED_VERSION}. ` +
        "Falling back to profile-only grounding until this consumer is updated.",
    );
    return null;
  }

  if (!Array.isArray(o.items)) return null;

  const entries = o.items.map(parseEntry).filter((e): e is WritingEntry => e !== null);
  return { version: SUPPORTED_VERSION, count: entries.length, entries };
}

export function writingIndexUrl(): string {
  return process.env.MEESE_RS_INDEX_URL || DEFAULT_INDEX_URL;
}

/** One fetch, no caching. Exported so tests can exercise it without the TTL. */
export async function fetchWritingIndex(url = writingIndexUrl()): Promise<WritingIndex | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`writing-index: ${url} returned ${res.status}`);
      return null;
    }
    return parseWritingIndex(await res.json());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`writing-index: fetch failed (${message})`);
    return null;
  }
}

type Cache = { index: WritingIndex | null; at: number };
let cache: Cache | null = null;
let inFlight: Promise<WritingIndex | null> | null = null;

/**
 * The catalog, cached for an hour.
 *
 * A failed fetch is cached too. Otherwise every chat turn during an outage
 * would pay the full timeout, turning a degraded clone into a slow one.
 * Concurrent callers share one request rather than stampeding.
 */
export async function getWritingIndex(now = Date.now()): Promise<WritingIndex | null> {
  if (cache && now - cache.at < TTL_MS) return cache.index;
  if (inFlight) return inFlight;

  inFlight = fetchWritingIndex()
    .then((index) => {
      cache = { index, at: now };
      return index;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Test seam: drop the memo so a case can observe a fresh fetch. */
export function resetWritingIndexCache(): void {
  cache = null;
  inFlight = null;
}
