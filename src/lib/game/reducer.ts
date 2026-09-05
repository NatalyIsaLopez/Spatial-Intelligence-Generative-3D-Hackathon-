import { LEVELS } from "./levels";
import { validateSketch } from "./validate";
import {
  RETRY_PENALTY,
  type GameAction,
  type GameState,
  type HarvestState,
  type LevelDef,
  type LevelScore,
} from "./types";

const IDLE_HARVEST: HarvestState = {
  picked: 0,
  remaining: 0,
  msLeft: 0,
  endsAt: null,
};

export function initialState(levels: LevelDef[] = LEVELS): GameState {
  return {
    phase: "idle",
    levelIndex: 0,
    level: levels[0] ?? null,
    attempts: 0,
    rejection: null,
    error: null,
    sketch: null,
    harvest: IDLE_HARVEST,
    scores: [],
    totalScore: 0,
  };
}

function scoreLevel(level: LevelDef, picked: number, attempts: number): LevelScore {
  const fruitPoints = picked * level.harvest.pointsPerItem;
  const retryPenalty = Math.max(0, attempts - 1) * RETRY_PENALTY;
  return {
    levelId: level.id,
    fruit: level.harvest.fruit,
    picked,
    attempts,
    fruitPoints,
    retryPenalty,
    total: Math.max(0, fruitPoints - retryPenalty),
  };
}

/**
 * Pure. Every transition the game can make lives here, so the whole loop is
 * testable without a renderer, a timer, or a network call.
 *
 * Actions that do not apply to the current phase are ignored rather than
 * throwing — a stray click during an animation should not crash the run.
 */
export function gameReducer(
  state: GameState,
  action: GameAction,
  levels: LevelDef[] = LEVELS,
): GameState {
  switch (action.type) {
    case "START": {
      if (state.phase !== "idle") return state;
      const level = getLevelFrom(levels, 0);
      if (!level) return state;
      return { ...state, phase: "briefing", level, levelIndex: 0 };
    }

    case "OPEN_SKETCHBOOK": {
      if (state.phase !== "briefing" && state.phase !== "rejected") return state;
      return { ...state, phase: "sketching", rejection: null, error: null };
    }

    case "SUBMIT_SKETCH": {
      if (state.phase !== "sketching") return state;
      if (!state.level) return state;

      const attempts = state.attempts + 1;
      const result = validateSketch(action.prompt, state.level.solution);

      if (!result.ok) {
        return {
          ...state,
          phase: "rejected",
          attempts,
          rejection: result.reason ?? state.level.solution.hint,
          sketch: { prompt: action.prompt, modelUrl: null },
        };
      }

      return {
        ...state,
        phase: "generating",
        attempts,
        rejection: null,
        error: null,
        sketch: { prompt: action.prompt, modelUrl: null },
      };
    }

    case "MODEL_READY": {
      if (state.phase !== "generating") return state;
      return {
        ...state,
        phase: "traversing",
        sketch: state.sketch
          ? { ...state.sketch, modelUrl: action.modelUrl }
          : { prompt: "", modelUrl: action.modelUrl },
      };
    }

    case "MODEL_FAILED": {
      if (state.phase !== "generating") return state;
      // Mint failing is not the player's fault, so this does not count as a
      // rejected sketch. Send them back to the sketchbook with the reason.
      return { ...state, phase: "rejected", error: action.message, rejection: null };
    }

    case "TRAVERSE_COMPLETE": {
      if (state.phase !== "traversing") return state;
      if (!state.level) return state;
      const { durationMs, spawnCount } = state.level.harvest;
      return {
        ...state,
        phase: "harvesting",
        harvest: {
          picked: 0,
          remaining: spawnCount,
          msLeft: durationMs,
          // Filled in by the engine on the first tick, so the reducer stays
          // free of clock reads.
          endsAt: null,
        },
      };
    }

    case "TICK": {
      if (state.phase !== "harvesting") return state;
      if (!state.level) return state;

      const endsAt = state.harvest.endsAt ?? action.now + state.level.harvest.durationMs;
      const msLeft = Math.max(0, endsAt - action.now);

      if (msLeft === 0) {
        return finishHarvest({ ...state, harvest: { ...state.harvest, endsAt, msLeft: 0 } });
      }

      return { ...state, harvest: { ...state.harvest, endsAt, msLeft } };
    }

    case "PICK": {
      if (state.phase !== "harvesting") return state;
      if (state.harvest.remaining <= 0) return state;

      const harvest = {
        ...state.harvest,
        picked: state.harvest.picked + 1,
        remaining: state.harvest.remaining - 1,
      };

      // Clearing the bush ends the level early rather than making the player
      // wait out a timer with nothing left to pick.
      if (harvest.remaining === 0) {
        return finishHarvest({ ...state, harvest });
      }

      return { ...state, harvest };
    }

    case "END_HARVEST": {
      if (state.phase !== "harvesting") return state;
      return finishHarvest(state);
    }

    case "NEXT_LEVEL": {
      if (state.phase !== "cleared") return state;
      const nextIndex = state.levelIndex + 1;
      const level = getLevelFrom(levels, nextIndex);

      if (!level) {
        return { ...state, phase: "finished", level: null };
      }

      return {
        ...state,
        phase: "briefing",
        levelIndex: nextIndex,
        level,
        attempts: 0,
        rejection: null,
        error: null,
        sketch: null,
        harvest: IDLE_HARVEST,
      };
    }

    case "RESET":
      return initialState(levels);

    default:
      return state;
  }
}

function finishHarvest(state: GameState): GameState {
  if (!state.level) return state;
  const score = scoreLevel(state.level, state.harvest.picked, state.attempts);
  return {
    ...state,
    phase: "cleared",
    harvest: { ...state.harvest, msLeft: 0, endsAt: null },
    scores: [...state.scores, score],
    totalScore: state.totalScore + score.total,
  };
}

function getLevelFrom(levels: LevelDef[], index: number): LevelDef | null {
  return levels[index] ?? null;
}
