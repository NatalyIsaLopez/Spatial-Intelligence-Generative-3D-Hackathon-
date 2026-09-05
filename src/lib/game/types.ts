/**
 * Core types for the Spatial Forge game loop.
 *
 * Nothing in this file imports React, Next, or the DOM. The engine is a plain
 * state machine so any renderer (React, canvas, three.js, a CLI) can drive it.
 */

export type ObstacleId = "river" | "crest" | "lake";
export type ToolId = "bridge" | "ladder" | "boat";
export type FruitId = "strawberry" | "blueberry" | "watermelon";

/**
 * Where the player is in a single level.
 *
 *   briefing   obstacle revealed, player has not started drawing
 *   sketching  sketchbook open, player is drawing
 *   generating sketch accepted, Mint is building the model
 *   rejected   sketch did not solve this obstacle, player may retry
 *   traversing the tool works; character is crossing
 *   harvesting timer running, player is picking fruit
 *   cleared    level scored, waiting to advance
 */
export type Phase =
  | "idle"
  | "briefing"
  | "sketching"
  | "generating"
  | "rejected"
  | "traversing"
  | "harvesting"
  | "cleared"
  | "finished";

/** A wrong answer that deserves a specific nudge rather than a generic miss. */
export interface NearMiss {
  /** Word or phrase that triggers this response. */
  term: string;
  /** What to tell the player. Explains why it fails, in the world's logic. */
  hint: string;
}

export interface SolutionDef {
  tool: ToolId;
  /** Shown in the UI as the goal, e.g. "a bridge". */
  label: string;
  /** Any of these words in the prompt counts as a correct answer. */
  accept: string[];
  /** Plausible-but-wrong answers that get a tailored hint. */
  nearMisses: NearMiss[];
  /** Fallback nudge when nothing matches at all. */
  hint: string;
}

export interface ObstacleDef {
  id: ObstacleId;
  label: string;
  /** One line of scene-setting for the UI. */
  brief: string;
  /** How long the crossing animation runs, in ms. */
  traverseMs: number;
}

export interface HarvestDef {
  fruit: FruitId;
  label: string;
  /** Countdown length in ms. */
  durationMs: number;
  /** How many pieces of fruit exist on the bush. */
  spawnCount: number;
  pointsPerItem: number;
}

export interface LevelDef {
  id: number;
  name: string;
  obstacle: ObstacleDef;
  solution: SolutionDef;
  harvest: HarvestDef;
}

/** What the player produced in the sketchbook. */
export interface Sketch {
  /** The text prompt handed to Mint. This is what gets validated. */
  prompt: string;
  /** Populated once Mint finishes. */
  modelUrl: string | null;
}

export interface HarvestState {
  picked: number;
  remaining: number;
  msLeft: number;
  /** Wall-clock ms at which the timer expires. Null outside the harvest phase. */
  endsAt: number | null;
}

export interface LevelScore {
  levelId: number;
  fruit: FruitId;
  picked: number;
  /** Sketches submitted before one was accepted. 1 means first try. */
  attempts: number;
  fruitPoints: number;
  retryPenalty: number;
  total: number;
}

export interface GameState {
  phase: Phase;
  levelIndex: number;
  /** Null only when the run has finished. */
  level: LevelDef | null;
  /** Sketches submitted on the current level, including the accepted one. */
  attempts: number;
  /** Why the last sketch was turned away. Cleared when the player retries. */
  rejection: string | null;
  /** Set when Mint itself fails, as opposed to a wrong drawing. */
  error: string | null;
  sketch: Sketch | null;
  harvest: HarvestState;
  scores: LevelScore[];
  totalScore: number;
}

export type GameAction =
  | { type: "START" }
  | { type: "OPEN_SKETCHBOOK" }
  | { type: "SUBMIT_SKETCH"; prompt: string }
  | { type: "MODEL_READY"; modelUrl: string }
  | { type: "MODEL_FAILED"; message: string }
  | { type: "TRAVERSE_COMPLETE" }
  | { type: "PICK" }
  | { type: "TICK"; now: number }
  | { type: "END_HARVEST" }
  | { type: "NEXT_LEVEL" }
  | { type: "RESET" };

/** Points deducted per rejected sketch. Score never goes below zero. */
export const RETRY_PENALTY = 25;
