import type { GenerateFn } from "./engine";
import { LEVELS } from "./levels";
import type { ToolId } from "./types";
import { validateSketch } from "./validate";

/**
 * Pre-generated models, served from public/artifacts.
 *
 * Live Mint generation is the real feature, but it takes time and depends on
 * the API being up. This gives you the same game with instant, guaranteed
 * models — worth having on the day you demo.
 */
export const PREBAKED_MODELS: Record<ToolId, string> = {
  bridge: "/artifacts/bridge.glb",
  ladder: "/artifacts/ladder.glb",
  boat: "/artifacts/boat.glb",
};

export const CHARACTER_MODEL = "/artifacts/character.glb";

export interface PrebakedOptions {
  /** Fake thinking time in ms, so the generating phase is still visible. */
  delayMs?: number;
}

/**
 * Resolves a prompt to a local model by asking each level's validator which
 * tool the prompt describes. Same matching the game already uses, so a prompt
 * that passes validation always finds a model.
 */
export function createPrebakedGenerator(options: PrebakedOptions = {}): GenerateFn {
  const delayMs = options.delayMs ?? 1_200;

  return async function generate(prompt: string, signal: AbortSignal): Promise<string> {
    const tool = resolveTool(prompt);
    if (!tool) {
      throw new Error("No prebaked model matches that sketch.");
    }

    await delay(delayMs, signal);
    return PREBAKED_MODELS[tool];
  };
}

/**
 * Falls back to Mint when a prompt has no prebaked match, so players can still
 * draw something unexpected and get a real model.
 */
export function createHybridGenerator(live: GenerateFn, options: PrebakedOptions = {}): GenerateFn {
  const prebaked = createPrebakedGenerator(options);

  return async function generate(prompt: string, signal: AbortSignal): Promise<string> {
    if (resolveTool(prompt)) {
      return prebaked(prompt, signal);
    }
    return live(prompt, signal);
  };
}

function resolveTool(prompt: string): ToolId | null {
  for (const level of LEVELS) {
    if (validateSketch(prompt, level.solution).ok) {
      return level.solution.tool;
    }
  }
  return null;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
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
