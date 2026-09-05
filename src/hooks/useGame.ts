"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { GameEngine, createMintGenerator, type EngineOptions, type GameState } from "@/lib/game";

export interface UseGameOptions extends EngineOptions {
  /**
   * Set false to skip the Mint call entirely and hand back a placeholder model
   * after a short delay. Useful for building UI without burning credits.
   */
  live?: boolean;
}

export interface UseGame {
  state: GameState;
  engine: GameEngine;
  start: () => void;
  openSketchbook: () => void;
  submitSketch: (prompt: string) => void;
  pick: () => void;
  nextLevel: () => void;
  reset: () => void;
  /** Countdown as 0..1, for progress rings and bars. */
  harvestProgress: number;
  /** Whole seconds remaining, already rounded up for display. */
  secondsLeft: number;
}

/**
 * Binds a React tree to one GameEngine instance. The engine lives outside
 * React state, so re-renders come from useSyncExternalStore rather than from
 * copying game state into a component.
 */
export function useGame(options: UseGameOptions = {}): UseGame {
  const { live = true, generate, ...engineOptions } = options;

  // Keep option identity stable so the engine is never rebuilt mid-run.
  const optionsRef = useRef({ live, generate, engineOptions });

  const engine = useMemo(() => {
    const current = optionsRef.current;
    return new GameEngine({
      ...current.engineOptions,
      generate: current.generate ?? (current.live ? createMintGenerator() : stubGenerator),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => engine.destroy(), [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  const duration = state.level?.harvest.durationMs ?? 0;
  const harvestProgress = duration > 0 ? state.harvest.msLeft / duration : 0;

  return {
    state,
    engine,
    start: engine.start,
    openSketchbook: engine.openSketchbook,
    submitSketch: engine.submitSketch,
    pick: engine.pick,
    nextLevel: engine.nextLevel,
    reset: engine.reset,
    harvestProgress,
    secondsLeft: Math.ceil(state.harvest.msLeft / 1000),
  };
}

/** Stands in for Mint while the UI is being built. */
async function stubGenerator(prompt: string, signal: AbortSignal): Promise<string> {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 900);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
  return `stub://model/${encodeURIComponent(prompt)}`;
}
