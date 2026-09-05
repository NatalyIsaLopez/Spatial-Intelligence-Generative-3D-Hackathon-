import { LEVELS } from "./levels";
import { gameReducer, initialState } from "./reducer";
import type { GameAction, GameState, LevelDef } from "./types";

/** Turns a prompt into a model URL. Injected so the engine can be tested offline. */
export type GenerateFn = (prompt: string, signal: AbortSignal) => Promise<string>;

export interface EngineOptions {
  levels?: LevelDef[];
  /** Defaults to the Mint bridge in mintBridge.ts. */
  generate?: GenerateFn;
  /** Override the clock in tests. */
  now?: () => number;
  /** Harvest countdown resolution in ms. */
  tickMs?: number;
  /**
   * Skip the crossing delay and jump straight to the harvest. Useful while
   * your teammates' animation is still being built.
   */
  skipTraversal?: boolean;
}

type Listener = () => void;

/**
 * Drives the game loop. Owns the two things a pure reducer cannot: wall-clock
 * timers and the call out to Mint.
 *
 * Bind any UI to it with subscribe() + getState(), or use the useGame() hook.
 */
export class GameEngine {
  private state: GameState;
  private readonly levels: LevelDef[];
  private readonly generate: GenerateFn | null;
  private readonly now: () => number;
  private readonly tickMs: number;
  private readonly skipTraversal: boolean;

  private listeners = new Set<Listener>();
  private harvestTimer: ReturnType<typeof setInterval> | null = null;
  private traverseTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: AbortController | null = null;

  constructor(options: EngineOptions = {}) {
    this.levels = options.levels ?? LEVELS;
    this.generate = options.generate ?? null;
    this.now = options.now ?? (() => Date.now());
    this.tickMs = options.tickMs ?? 100;
    this.skipTraversal = options.skipTraversal ?? false;
    this.state = initialState(this.levels);
  }

  getState = (): GameState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Feed an action through the reducer, then run whatever side effects the new
   * phase requires. Safe to call from anywhere.
   */
  dispatch = (action: GameAction): void => {
    const previous = this.state;
    const next = gameReducer(previous, action, this.levels);
    if (next === previous) return;

    this.state = next;
    this.reconcileEffects(previous, next);
    this.emit();
  };

  // --- Player-facing commands -------------------------------------------

  start = () => this.dispatch({ type: "START" });
  openSketchbook = () => this.dispatch({ type: "OPEN_SKETCHBOOK" });
  pick = () => this.dispatch({ type: "PICK" });
  nextLevel = () => this.dispatch({ type: "NEXT_LEVEL" });

  /**
   * Submit a drawing. If the prompt does not solve the obstacle the engine
   * lands in "rejected" and never calls Mint, so wrong guesses cost nothing.
   */
  submitSketch = (prompt: string): void => {
    this.dispatch({ type: "SUBMIT_SKETCH", prompt });
    if (this.state.phase === "generating") {
      void this.runGeneration(prompt);
    }
  };

  reset = (): void => {
    this.clearTimers();
    this.abortGeneration();
    this.dispatch({ type: "RESET" });
  };

  /** Call when unmounting so no timer outlives the view. */
  destroy = (): void => {
    this.clearTimers();
    this.abortGeneration();
    this.listeners.clear();
  };

  // --- Side effects ------------------------------------------------------

  private reconcileEffects(previous: GameState, next: GameState): void {
    if (previous.phase === next.phase) return;

    if (previous.phase === "traversing") this.clearTraverseTimer();
    if (previous.phase === "harvesting") this.clearHarvestTimer();

    if (next.phase === "traversing") {
      if (this.skipTraversal) {
        queueMicrotask(() => this.dispatch({ type: "TRAVERSE_COMPLETE" }));
      } else {
        const ms = next.level?.obstacle.traverseMs ?? 0;
        this.traverseTimer = setTimeout(() => {
          this.traverseTimer = null;
          this.dispatch({ type: "TRAVERSE_COMPLETE" });
        }, ms);
      }
    }

    if (next.phase === "harvesting") {
      // First tick seeds endsAt from the clock, so the deadline is set once
      // and every later tick just reads against it.
      this.dispatch({ type: "TICK", now: this.now() });
      this.harvestTimer = setInterval(() => {
        this.dispatch({ type: "TICK", now: this.now() });
      }, this.tickMs);
    }
  }

  private async runGeneration(prompt: string): Promise<void> {
    if (!this.generate) {
      this.dispatch({
        type: "MODEL_FAILED",
        message: "No model generator is wired up. Pass `generate` to the engine.",
      });
      return;
    }

    this.abortGeneration();
    const controller = new AbortController();
    this.inFlight = controller;

    try {
      const modelUrl = await this.generate(prompt, controller.signal);
      if (controller.signal.aborted) return;
      this.dispatch({ type: "MODEL_READY", modelUrl });
    } catch (error) {
      if (controller.signal.aborted) return;
      this.dispatch({
        type: "MODEL_FAILED",
        message: error instanceof Error ? error.message : "Model generation failed.",
      });
    } finally {
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  private abortGeneration(): void {
    this.inFlight?.abort();
    this.inFlight = null;
  }

  private clearTimers(): void {
    this.clearHarvestTimer();
    this.clearTraverseTimer();
  }

  private clearHarvestTimer(): void {
    if (this.harvestTimer !== null) {
      clearInterval(this.harvestTimer);
      this.harvestTimer = null;
    }
  }

  private clearTraverseTimer(): void {
    if (this.traverseTimer !== null) {
      clearTimeout(this.traverseTimer);
      this.traverseTimer = null;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
