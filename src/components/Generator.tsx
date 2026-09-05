"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ModelStage from "./ModelStage";

type Preset = "fast" | "standard" | "production";

type OperationView = {
  id: string;
  status: string;
  done?: boolean;
  assets?: {
    glbUrl?: string | null;
    optimizedGlbUrl?: string | null;
    fbxUrl?: string | null;
    objUrl?: string | null;
    stlUrl?: string | null;
    usdzUrl?: string | null;
    previewImageUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  billing?: { requiredCredits: number; availableCredits?: number; actionUrl: string };
  credits?: { estimated: number | null; reserved: number; finalized: number };
  error?: { code: string; message: string };
};

const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: "fast", label: "Fast", hint: "Quick iteration, lowest cost" },
  { id: "standard", label: "Standard", hint: "Balanced default" },
  { id: "production", label: "Production", hint: "Highest quality" },
];

// Mint's recommended cadence: start at 2s, grow 1.6x, cap at 15s, give up at 30 min.
const POLL_START_MS = 2000;
const POLL_FACTOR = 1.6;
const POLL_CAP_MS = 15000;
const POLL_DEADLINE_MS = 30 * 60 * 1000;

const STATUS_COPY: Record<string, string> = {
  queued: "Queued at Mint…",
  running: "Sculpting geometry and baking textures…",
  preview_ready: "Preview ready for review",
  billing_required: "Billing action required",
  succeeded: "Done",
  partially_succeeded: "Finished with some failures",
  failed: "Generation failed",
  canceled: "Canceled",
};

export default function Generator() {
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<Preset>("fast");
  const [operation, setOperation] = useState<OperationView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Lets an unmount or a new run stop the in-flight polling loop.
  const runToken = useRef(0);

  useEffect(() => () => { runToken.current += 1; }, []);

  const poll = useCallback(async (operationId: string, token: number) => {
    const startedAt = Date.now();
    let wait = POLL_START_MS;

    while (runToken.current === token) {
      if (Date.now() - startedAt > POLL_DEADLINE_MS) {
        setError("Timed out after 30 minutes. The operation may still finish in Mint.");
        return;
      }

      // Jitter keeps parallel tabs from hammering the same second.
      const jittered = wait * (0.85 + Math.random() * 0.3);
      await new Promise((r) => setTimeout(r, jittered));
      if (runToken.current !== token) return;

      setElapsed(Math.round((Date.now() - startedAt) / 1000));

      let res: Response;
      try {
        res = await fetch(`/api/operations/${encodeURIComponent(operationId)}`);
      } catch {
        wait = Math.min(wait * POLL_FACTOR, POLL_CAP_MS);
        continue; // Transient network blip - keep polling.
      }

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After")) || 0;
        wait = Math.max(retryAfter * 1000, Math.min(wait * POLL_FACTOR, POLL_CAP_MS));
        continue;
      }

      const data = (await res.json()) as OperationView & { error?: unknown };

      if (!res.ok) {
        const message =
          typeof data.error === "string" ? data.error : "Polling failed.";
        setError(message);
        return;
      }

      setOperation(data);

      if (data.done) return;

      wait = Math.min(wait * POLL_FACTOR, POLL_CAP_MS);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;

    const token = ++runToken.current;
    setBusy(true);
    setError(null);
    setOperation(null);
    setElapsed(0);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, generationPreset: preset }),
      });
      const data = (await res.json()) as OperationView & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Mint rejected the request.");
        return;
      }

      setOperation(data);
      await poll(data.id, token);
    } catch {
      setError("Could not reach the server.");
    } finally {
      if (runToken.current === token) setBusy(false);
    }
  }

  const assets = operation?.assets;
  const glb = assets?.glbUrl ?? assets?.optimizedGlbUrl ?? null;
  const inFlight =
    operation != null && !operation.done && !error;

  const downloads = assets
    ? ([
        ["GLB", assets.glbUrl],
        ["GLB (optimized)", assets.optimizedGlbUrl],
        ["FBX", assets.fbxUrl],
        ["OBJ", assets.objUrl],
        ["STL", assets.stlUrl],
        ["USDZ", assets.usdzUrl],
      ] as const).filter(([, url]) => Boolean(url))
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={onSubmit}
        className="flex h-fit flex-col gap-5 rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)] p-5"
      >
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Prompt
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            maxLength={8000}
            placeholder="A weathered brass diving helmet with a cracked porthole"
            className="resize-none rounded-lg border border-[var(--color-edge)] bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-[var(--color-mint-dim)]"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Quality
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                title={p.hint}
                className={`rounded-lg border px-2 py-2 text-xs transition ${
                  preset === p.id
                    ? "border-[var(--color-mint)] bg-[var(--color-mint)]/10 text-[var(--color-mint)]"
                    : "border-[var(--color-edge)] text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-600">
            {PRESETS.find((p) => p.id === preset)?.hint}
          </p>
        </fieldset>

        <button
          type="submit"
          disabled={busy || !prompt.trim()}
          className="rounded-lg bg-[var(--color-mint)] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate model"}
        </button>

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {operation?.billing && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Needs {operation.billing.requiredCredits} Credits
            {operation.billing.availableCredits != null &&
              ` (${operation.billing.availableCredits} available)`}
            .{" "}
            <a
              href={operation.billing.actionUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Resolve billing
            </a>
          </div>
        )}
      </form>

      <section className="relative flex min-h-[440px] flex-col overflow-hidden rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)]">
        <div className="flex items-center justify-between border-b border-[var(--color-edge)] px-4 py-2.5 text-xs">
          <span className="text-neutral-400">
            {operation ? STATUS_COPY[operation.status] ?? operation.status : "Idle"}
          </span>
          {inFlight && <span className="text-neutral-600">{elapsed}s</span>}
        </div>

        <div className="relative flex-1">
          {glb ? (
            <ModelStage glbUrl={glb} posterUrl={assets?.previewImageUrl} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              {inFlight ? (
                <>
                  <div className="drift h-16 w-16 rounded-2xl border border-[var(--color-mint-dim)] bg-[var(--color-mint)]/5" />
                  <p className="text-sm text-neutral-500">
                    {STATUS_COPY[operation!.status] ?? operation!.status}
                  </p>
                  {operation?.credits?.estimated != null && (
                    <p className="text-xs text-neutral-600">
                      ~{operation.credits.estimated} Credits estimated
                    </p>
                  )}
                </>
              ) : (
                <p className="max-w-sm text-sm text-neutral-600">
                  Your model appears here. Drag to orbit, scroll to zoom.
                </p>
              )}
            </div>
          )}
        </div>

        {downloads.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-edge)] px-4 py-3">
            {downloads.map(([label, url]) => (
              <a
                key={label}
                href={url as string}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--color-edge)] px-2.5 py-1 text-xs text-neutral-300 transition hover:border-[var(--color-mint-dim)] hover:text-[var(--color-mint)]"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
