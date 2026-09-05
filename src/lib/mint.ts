/**
 * Server-only Mint API client.
 *
 * The API key never leaves trusted server code, so every function here must be
 * called from a route handler or server component - never from the browser.
 */
import "server-only";

const BASE_URL = "https://api.mint.gg/v1";

export type GenerationPreset = "fast" | "standard" | "production";
export type GenerationMode = "auto" | "review";
export type RiggingPose = "t_pose" | "a_pose";

export type OperationStatus =
  | "queued"
  | "running"
  | "preview_ready"
  | "billing_required"
  | "succeeded"
  | "partially_succeeded"
  | "failed"
  | "canceled";

/** Downloadable files Mint attaches to a finished 3D Model operation. */
export type ModelAssets = {
  glbUrl: string | null;
  glbSizeBytes: number | null;
  optimizedGlbUrl: string | null;
  optimizedGlbSizeBytes: number | null;
  fbxUrl: string | null;
  objUrl: string | null;
  stlUrl: string | null;
  usdzUrl: string | null;
  previewImageUrl: string | null;
  thumbnailUrl: string | null;
  bounds: unknown;
};

export type Operation = {
  object: "operation";
  id: string;
  type: string;
  generationMode: GenerationMode;
  status: OperationStatus;
  prompt?: string;
  generationPreset?: GenerationPreset;
  resource: { type: string; id: string } | null;
  assets?: Partial<ModelAssets>;
  billing?: {
    reason: string;
    resource: string;
    stage: "preview" | "final";
    requiredCredits: number;
    availableCredits?: number;
    actionUrl: string;
    ctaKind?: string;
  };
  credits?: {
    estimated: number | null;
    reserved: number;
    finalized: number;
    availableAfterReservation: number | null;
  };
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

/** RFC 9457 problem document returned by Mint on failure. */
export type MintProblem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Array<{ path?: string; code?: string; message: string }>;
};

export class MintError extends Error {
  readonly status: number;
  readonly problem: MintProblem | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    opts: {
      status: number;
      problem?: MintProblem | null;
      requestId?: string | null;
      retryAfterSeconds?: number | null;
    },
  ) {
    super(message);
    this.name = "MintError";
    this.status = opts.status;
    this.problem = opts.problem ?? null;
    this.requestId = opts.requestId ?? null;
    this.retryAfterSeconds = opts.retryAfterSeconds ?? null;
  }
}

function apiKey(): string {
  const key = process.env.MINT_API_KEY;
  if (!key) {
    throw new MintError(
      "MINT_API_KEY is not set. Add it to .env before generating.",
      { status: 500 },
    );
  }
  return key;
}

async function request<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const { idempotencyKey, ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${apiKey()}`);
  headers.set("Accept", "application/json");
  if (rest.body) headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
  });

  const requestId = res.headers.get("X-Request-Id");

  if (!res.ok) {
    let problem: MintProblem | null = null;
    try {
      problem = (await res.json()) as MintProblem;
    } catch {
      // Non-JSON error body; fall back to the status line.
    }

    const retryAfter = res.headers.get("Retry-After");
    // Prefer the first validation message - it names the offending field.
    const detail =
      problem?.errors?.[0]?.message ??
      problem?.detail ??
      problem?.title ??
      res.statusText;

    throw new MintError(detail, {
      status: res.status,
      problem,
      requestId,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
    });
  }

  return (await res.json()) as T;
}

export type GenerateModelInput = {
  prompt: string;
  name?: string;
  generationPreset?: GenerationPreset;
  generationMode?: GenerationMode;
  riggingPose?: RiggingPose;
  /** One public HTTPS reference image. Mutually exclusive with sourceImages. */
  imageUrl?: string;
  /** Two to eight public HTTPS reference images. Mutually exclusive with imageUrl. */
  sourceImages?: string[];
};

/**
 * Start a 3D Model generation. Returns the accepted operation; the model is not
 * ready yet - poll `getOperation` with the returned id.
 */
export function generateModel(input: GenerateModelInput): Promise<Operation> {
  if (input.imageUrl && input.sourceImages?.length) {
    throw new MintError(
      "Send either imageUrl or sourceImages, never both.",
      { status: 400 },
    );
  }

  const body: Record<string, unknown> = {
    prompt: input.prompt,
    generationPreset: input.generationPreset ?? "standard",
  };
  // Omit optional fields entirely rather than sending nulls - the schema sets
  // additionalProperties: false and validates each present field.
  if (input.name) body.name = input.name;
  if (input.generationMode) body.generationMode = input.generationMode;
  if (input.riggingPose) body.riggingPose = input.riggingPose;
  if (input.imageUrl) body.imageUrl = input.imageUrl;
  if (input.sourceImages?.length) body.sourceImages = input.sourceImages;

  return request<Operation>("/models:generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getOperation(operationId: string): Promise<Operation> {
  return request<Operation>(`/operations/${encodeURIComponent(operationId)}`);
}

export function getUsage(): Promise<unknown> {
  return request("/usage");
}

/**
 * An operation is done only when it reaches a terminal status AND its Credit
 * reservation has settled - Mint can still report `running` while it finalizes.
 */
export function isTerminal(op: Operation): boolean {
  const terminal: OperationStatus[] = [
    "succeeded",
    "partially_succeeded",
    "failed",
    "canceled",
    "preview_ready",
    "billing_required",
  ];
  if (!terminal.includes(op.status)) return false;

  if (
    (op.status === "succeeded" || op.status === "partially_succeeded") &&
    (op.credits?.reserved ?? 0) > 0
  ) {
    return false;
  }
  return true;
}
