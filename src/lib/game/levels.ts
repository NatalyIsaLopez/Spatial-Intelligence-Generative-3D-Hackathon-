import type { LevelDef } from "./types";

/**
 * The three levels, as data. Add a fourth by appending to this array — the
 * engine reads length, so nothing else needs to change.
 */
export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "The Stream",
    obstacle: {
      id: "river",
      label: "a stream",
      brief: "Water cuts across the path. The far bank is close, but the current is quick.",
      traverseMs: 2600,
    },
    solution: {
      tool: "bridge",
      label: "a bridge",
      accept: [
        "bridge",
        "footbridge",
        "plank",
        "planks",
        "walkway",
        "gangplank",
        "catwalk",
        "boardwalk",
        "span",
        "log",
      ],
      nearMisses: [
        {
          term: "boat",
          hint: "A boat drifts downstream before you reach the other side. Draw something that stays put.",
        },
        {
          term: "raft",
          hint: "A raft drifts downstream before you reach the other side. Draw something that stays put.",
        },
        {
          term: "ladder",
          hint: "A ladder lies flat in the water and sinks. This gap needs something that holds your weight across it.",
        },
      ],
      hint: "Draw something that lays across the water and holds still.",
    },
    harvest: {
      fruit: "strawberry",
      label: "strawberries",
      durationMs: 10_000,
      spawnCount: 14,
      pointsPerItem: 10,
    },
  },
  {
    id: 2,
    name: "The Crest",
    obstacle: {
      id: "crest",
      label: "a rocky crest",
      brief: "The ground folds upward into a wall of rock. The top is out of reach.",
      traverseMs: 3200,
    },
    solution: {
      tool: "ladder",
      label: "a ladder",
      accept: [
        "ladder",
        "stepladder",
        "rope ladder",
        "ladders",
        "stairs",
        "staircase",
        "steps",
        "rungs",
        "scaffold",
      ],
      nearMisses: [
        {
          term: "bridge",
          hint: "A bridge spans a gap. This is a climb — you need to go up, not across.",
        },
        {
          term: "boat",
          hint: "There is no water here. Draw something you can climb.",
        },
        {
          term: "rope",
          hint: "A bare rope gives you nothing to stand on. Add rungs.",
        },
      ],
      hint: "Draw something with rungs you can climb.",
    },
    harvest: {
      fruit: "blueberry",
      label: "blueberries",
      durationMs: 10_000,
      spawnCount: 20,
      pointsPerItem: 15,
    },
  },
  {
    id: 3,
    name: "The Lake",
    obstacle: {
      id: "lake",
      label: "a wide lake",
      brief: "Open water, too far to span. Something on the far shore is catching the light.",
      traverseMs: 4200,
    },
    solution: {
      tool: "boat",
      label: "a boat",
      accept: [
        "boat",
        "rowboat",
        "raft",
        "canoe",
        "kayak",
        "dinghy",
        "punt",
        "ferry",
        "skiff",
        "sailboat",
      ],
      nearMisses: [
        {
          term: "bridge",
          hint: "The far shore is too distant to span. Draw something that floats.",
        },
        {
          term: "ladder",
          hint: "A ladder has nothing to lean against out here. Draw something that floats.",
        },
      ],
      hint: "Draw something that floats and carries you.",
    },
    harvest: {
      fruit: "golden-pear",
      label: "the golden pear",
      durationMs: 12_000,
      spawnCount: 1,
      pointsPerItem: 250,
    },
  },
];

export function getLevel(index: number): LevelDef | null {
  return LEVELS[index] ?? null;
}
