import type { GenerateFn } from "./engine";

/**
 * Talks to the API routes already in this project:
 *   POST /api/generate            -> starts a job, returns an operation
 *   GET  /api/operations/{id}     -> reports progress until terminal
 *
 * The polling cadence matches the Mint client in src/lib/mint.ts: 2s to start,
 * 1.6x backoff, 15s ceiling, jitter, and Retry-After honoured on 429.
 *
 * ---------------------------------------------------------------------------
 * ADAPTER NOTE: the field names below are guesses at your route's response
 * shape. If a generation fails with "could not find an operation id" or
 * "could not find a model URL", open the browser network tab, look at the real
 * JSON, and add the correct key to the arrays in pickOperationId / pickModelUrl.
 * Nothing else needs to change.
 * ---------------------------------------------------------------------------
 */

const START_DELAY_MS = 2_000;
const BACKOFF = 1.6;
const MAX_DELAY_MS = 15_000;
const DEADLINE_MS = 30 * 60 * 1_000;

export interface MintBridgeOptions {
  generateUrl?: string;
  operationUrl?: (id: string) => string;
  /** Preferred download format, matched case-insensitively against the result. */
  format?: string;
}

export function createMintGenerator(options: MintBridgeOptions = {}): GenerateFn {
  const generateUrl = options.generateUrl ?? "/api/generate";
  const operationUrl = options.operationUrl ?? ((id: string) => `/api/operations/${id}`);
  const format = (options.format ?? "glb").toLowerCase();

  return async function generate(prompt: string, signal: AbortSignal): Promise<string> {
    const startResponse = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (!startResponse.ok) {
      throw new Error(await describeFailure(startResponse));
    }

    const started = await startResponse.json();

    // Some backends return the finished asset immediately on a cache hit.
    const immediate = pickModelUrl(started, format);
    if (immediate) return immediate;

    const operationId = pickOperationId(started);
    if (!operationId) {
      throw new Error(
        `Could not find an operation id in the response from ${generateUrl}. ` +
          `Keys received: ${Object.keys(started ?? {}).join(", ") || "none"}.`,
      );
    }

    return pollOperation(operationId, operationUrl, format, signal);
  };
}

async function pollOperation(
  id: string,
  operationUrl: (id: string) => string,
  format: string,
  signal: AbortSignal,
): Promise<string> {
  const deadline = Date.now() + DEADLINE_MS;
  let delay = START_DELAY_MS;

  while (Date.now() < deadline) {
    await sleep(withJitter(delay), signal);

    const response = await fetch(operationUrl(id), { signal });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : delay * BACKOFF;
      delay = Math.min(delay, MAX_DELAY_MS);
      continue;
    }

    if (!response.ok) {
      throw new Error(await describeFailure(response));
    }

    const body = await response.json();
    const status = String(body?.status ?? body?.state ?? "").toLowerCase();

    if (status === "failed" || status === "cancelled" || status === "canceled") {
      throw new Error(readProblem(body) ?? "Mint could not build that model. Try a simpler shape.");
    }

    if (status === "billing_required") {
      throw new Error("Mint needs billing set up before it can finish this model.");
    }

    // Treat any terminal-looking state as done once a URL is actually present,
    // which also covers partially_succeeded.
    const modelUrl = pickModelUrl(body, format);
    if (modelUrl) return modelUrl;

    if (status === "succeeded") {
      throw new Error(
        "Mint reported success but returned no downloadable model. " +
          "Check the asset keys in pickModelUrl().",
      );
    }

    delay = Math.min(delay * BACKOFF, MAX_DELAY_MS);
  }

  throw new Error("Model generation timed out.");
}

const OPERATION_ID_KEYS = ["operationId", "operation_id", "id", "name", "jobId", "job_id"];

function pickOperationId(body: unknown): string | null {
  const source = unwrap(body);
  if (!source) return null;

  for (const key of OPERATION_ID_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value) {
      // Handles resource names like "operations/abc123".
      return value.includes("/") ? value.split("/").pop()! : value;
    }
  }
  return null;
}

const URL_KEYS = ["url", "uri", "downloadUrl", "download_url", "signedUrl", "href"];

/**
 * Digs a model URL out of whatever shape the operation result takes: a flat
 * url field, an assets array, or a keyed map of formats.
 */
function pickModelUrl(body: unknown, format: string): string | null {
  const source = unwrap(body);
  if (!source) return null;

  const containers = [
    source,
    unwrap(source.result),
    unwrap(source.response),
    unwrap(source.model),
    unwrap(source.output),
  ].filter(Boolean) as Record<string, unknown>[];

  for (const container of containers) {
    const assets = container.assets ?? container.files ?? container.outputs;

    if (Array.isArray(assets)) {
      const match =
        assets.find((asset) => matchesFormat(asset, format)) ??
        assets.find((asset) => Boolean(readUrl(asset)));
      const url = readUrl(match);
      if (url) return url;
    }

    if (assets && typeof assets === "object") {
      const map = assets as Record<string, unknown>;
      const key = Object.keys(map).find((candidate) => candidate.toLowerCase() === format);
      const url = readUrl(map[key ?? ""]) ?? readUrl(Object.values(map)[0]);
      if (url) return url;
    }

    const direct = readUrl(container);
    if (direct) return direct;
  }

  return null;
}

function matchesFormat(asset: unknown, format: string): boolean {
  const record = unwrap(asset);
  if (!record) return false;

  const declared = [record.format, record.type, record.mimeType, record.name, record.filename]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  if (declared.some((value) => value.includes(format))) return true;

  const url = readUrl(record);
  return typeof url === "string" && url.toLowerCase().includes(`.${format}`);
}

function readUrl(candidate: unknown): string | null {
  if (typeof candidate === "string") {
    return candidate.startsWith("http") || candidate.startsWith("/") ? candidate : null;
  }
  const record = unwrap(candidate);
  if (!record) return null;

  for (const key of URL_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function readProblem(body: unknown): string | null {
  const record = unwrap(body);
  if (!record) return null;
  const error = unwrap(record.error) ?? record;
  const detail = error.detail ?? error.message ?? error.title;
  return typeof detail === "string" && detail ? detail : null;
}

function unwrap(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

async function describeFailure(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return readProblem(body) ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

function withJitter(ms: number): number {
  return ms * (0.85 + Math.random() * 0.3);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
