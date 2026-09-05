# Spatial Forge — game engine

The full game loop as a state machine. No React, no DOM, no Mint calls inside
the core: your teammates can build any interface on top and the rules stay put.

## Where the files go

Copy these into your repo, keeping the paths:

```
src/lib/game/types.ts        type definitions
src/lib/game/levels.ts       the three levels, as data
src/lib/game/validate.ts     does this drawing solve this obstacle?
src/lib/game/reducer.ts      pure state machine
src/lib/game/engine.ts       timers, subscriptions, Mint calls
src/lib/game/mintBridge.ts   talks to your existing /api routes
src/lib/game/index.ts        barrel export
src/hooks/useGame.ts         React binding
scripts/playthrough.ts       headless test of the whole loop
```

## Prove it works before touching the UI

```bash
npx tsx scripts/playthrough.ts
```

Plays all three levels with a fake generator: wrong answers, retries, timer
expiry, clearing a bush early, and a Mint outage. 45 checks. If they pass, the
rules are sound and anything broken after this is a wiring problem, not a logic
problem.

## The loop

```
  idle
   │  start()
   ▼
  briefing ──────────────────┐
   │  openSketchbook()       │
   ▼                         │
  sketching                  │
   │  submitSketch(prompt)   │
   ├──── wrong ──► rejected ─┘  (openSketchbook to retry)
   │                    ▲
   ▼ right              │ Mint error
  generating ───────────┘
   │  model ready
   ▼
  traversing            crossing animation, obstacle.traverseMs
   │
   ▼
  harvesting            timer running, pick() repeatedly
   │  timer hits 0, or bush emptied
   ▼
  cleared ──── nextLevel() ──► briefing (next level) or finished
```

Two details worth knowing:

**A wrong drawing never calls Mint.** Validation happens first, so bad guesses
cost nothing in credits or latency.

**A Mint failure is not a wrong answer.** It lands back in `rejected` with
`state.error` set and `state.rejection` null, and it does not add a retry
penalty. The player is not punished for the API being down.

## What the UI binds to

```tsx
"use client";
import { useGame } from "@/hooks/useGame";

export default function Game() {
  const { state, start, openSketchbook, submitSketch, pick, nextLevel, secondsLeft } = useGame();

  if (state.phase === "idle") return <button onClick={start}>Start</button>;

  if (state.phase === "harvesting") {
    return (
      <>
        <p>{secondsLeft}s — {state.harvest.picked} picked, {state.harvest.remaining} left</p>
        <button onClick={pick}>Pick</button>
      </>
    );
  }

  // ...one branch per phase
}
```

Everything the interface needs is on `state`:

| Field | Use |
| --- | --- |
| `phase` | which screen to show |
| `level.obstacle.brief` | the scene-setting line |
| `level.solution.label` | what to draw, e.g. "a bridge" |
| `level.harvest.label` | what's on the bush |
| `rejection` | why the last drawing was turned away |
| `error` | Mint failed; not the player's fault |
| `sketch.modelUrl` | hand this to `<model-viewer>` |
| `harvest.picked` / `.remaining` / `.msLeft` | the HUD |
| `scores` / `totalScore` | the tally |

The hook also gives you `harvestProgress` (1 → 0) for a timer ring, and
`secondsLeft` already rounded for display.

### Building UI without burning Mint credits

```tsx
const game = useGame({ live: false, skipTraversal: true });
```

`live: false` returns a placeholder URL after ~900ms instead of calling Mint.
`skipTraversal` jumps straight past the crossing animation.

## Wiring the sketchbook

Your teammate's sketchbook needs to end up producing a text prompt, since Mint
generates from text. Whatever the drawing surface is, the handoff is one call:

```ts
submitSketch("a wooden bridge");
```

If the sketchbook is purely visual with no text field, the simplest bridge is a
label input next to the canvas — the player draws *and* names it. That also
makes validation honest, since you are checking what they meant to draw.

## Tuning the levels

Everything lives in `src/lib/game/levels.ts`. Change a timer, a fruit count, or
the points without touching any logic:

```ts
harvest: {
  fruit: "strawberry",
  label: "strawberries",
  durationMs: 10_000,
  spawnCount: 14,
  pointsPerItem: 10,
}
```

Scoring per level is `picked × pointsPerItem − (attempts − 1) × 25`, floored at
zero. The penalty constant is `RETRY_PENALTY` in `types.ts`.

Accepted answers are generous on purpose — level 1 takes bridge, footbridge,
plank, planks, walkway, gangplank, catwalk, boardwalk, span, and log. Add more
to the `accept` array as playtesters surface them.

`nearMisses` give a specific hint for a plausible wrong answer. Drawing a boat
at the stream tells you it drifts downstream, rather than a generic "try again".
This is where the game teaches its own logic, so it's worth expanding.

A fourth level is just a fourth entry in the array. The engine reads the array
length.

## One thing to check on first run

`mintBridge.ts` guesses at the JSON shape your `/api/generate` and
`/api/operations/[id]` routes return, because I wrote it without seeing those
files. If a generation fails with "could not find an operation id" or "could not
find a model URL", open the network tab, look at the real response, and add the
correct key to `OPERATION_ID_KEYS` or `URL_KEYS` near the bottom of that file.
It already handles flat `url` fields, `assets` arrays, and format-keyed maps, so
there's a good chance it works untouched.
