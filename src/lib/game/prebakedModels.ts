import type { GenerateFn } from "./engine";
import { LEVELS } from "./levels";
import type { FruitId, ToolId } from "./types";
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

/** The bush the fruit grows on, shown during the harvest. */
export const BUSH_MODEL = "/artifacts/bush.glb";

/**
 * Fruit models, keyed by the FruitId in levels.ts.
 *
 * Blueberry and watermelon fall back to the persimmon until their own
 * models exist. Swap a single line when one lands in public/artifacts —
 * nothing else in the game needs to know.
 */
export const FRUIT_MODELS: Record<FruitId, string> = {
  strawberry: "/artifacts/strawberry.glb",
  blueberry: "/artifacts/persimmon.glb",
  watermelon: "/artifacts/melon.glb",
};

/** Model for the fruit on a given level, or null outside a level. */
export function fruitModelFor(fruit: FruitId | undefined): string | null {
  return fruit ? FRUIT_MODELS[fruit] : null;
}

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
