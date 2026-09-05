# The Mending — MVP

Technical spike for the "Gaming & Interactive Worlds" track of the Spatial
Intelligence + Generative 3D Hackathon. Tests the riskiest part of the game
loop end to end, with placeholder art everywhere else: **draw the missing
piece → recognize the shape → generate a 3D object → place it into the
world.**

## What this MVP proves

- A player can draw a shape (in any number of strokes) and a from-scratch
  **$P Point-Cloud recognizer** (`src/dollarP.js`, BSD-licensed algorithm,
  runs entirely client-side, no network call) matches it against templates
  you record yourself.
- On a match, the sketch is handed off to a generation step
  (`src/tripo.js`) that's meant to call the real Tripo image-to-3D API once
  you have credentials from check-in. Until then it falls back to a
  procedural placeholder bridge mesh, so the rest of the pipeline can be
  tested today.
- The generated object is auto-scaled and positioned to fit a known "socket"
  gap in the world (`src/placement.js`), with a simple rise-in animation.

## Explicitly NOT in this MVP

NPC dialogue, the real World Labs environment, Convex persistence/gallery,
multiple worlds/puzzles, art polish, demo fallback caching. All deferred
until this core loop is proven.

## Running it

```bash
npm install
npm run dev
```

Then in the browser:

1. Click **Record Template Mode**, then **Draw**, sketch a few example
   bridges (2-3 varied examples), hit **Submit Drawing** after each. This
   seeds the recognizer's templates (stored in `localStorage`).
2. Turn recording off, click **Draw** again, sketch a bridge, hit
   **Submit Drawing**. If recognized, a placeholder bridge mesh rises into
   the gap between the two banks.
3. If it says "doesn't look like it," either your templates need more
   variety or `MATCH_THRESHOLD` in `src/main.js` needs tuning.

## Sketchbook component (`src/sketchbook/`)

A standalone, reusable UI: a book icon (bottom-left) that opens into a
warm, painterly book overlay with a single blank drawing page. It never
reveals what the player is supposed to draw — that's discovered by talking
to NPCs elsewhere in the game. The host controls what currently counts as
correct via `sketchbook.setExpectedShape(name)`; drawing a different,
otherwise-valid shape (e.g. a boat while a bridge is expected) is rejected.
Level/progression order is the host's responsibility, not this
component's — see `src/sketchbookDemo.js` for a minimal example that
advances through bridge -> ladder -> boat -> strawberry.

The only integration surface is:

```js
const sketchbook = new Sketchbook({
  shapes: ['bridge', 'ladder', 'boat', 'strawberry'],
  onMatch: (shape) => { /* call Tripo, place the object, advance the level, etc. */ },
});
sketchbook.setExpectedShape('bridge');
```

Try it in isolation: `npm run dev` then visit `/sketchbook.html` (blank
background, just the icon, until you click it).

**Dev-only tools:** visit `/sketchbook.html?dev=1` for a hidden bar showing
"expecting: &lt;shape&gt;" (so you always know what the game currently
considers correct while testing) and shape chips that jump straight to
expecting a given shape, for quick manual testing without needing to play
through the whole level sequence. Also exposes `window.__sketchbook` in the
console for direct debugging (e.g. `__sketchbook.classifier.classify(...)`
on a hand-built canvas). None of this appears for players/judges — the
`?dev=1` flag gates it entirely client-side.

### Recognition: ml5.js DoodleNet, not hand-authored templates

This originally used a from-scratch $P point-cloud recognizer (see
`src/dollarP.js`, still used by the unrelated river-gap MVP in
`src/main.js`). It kept failing on real hand-drawn variation that hand-built
geometric templates didn't anticipate — every fix for one drawing style
broke on the next. Recognition now uses **ml5.js's DoodleNet**, a free,
MIT-licensed classifier pretrained on Google's Quick, Draw! dataset (tens
of thousands of real human doodles per category) — no templates to
maintain, and it already generalizes across real drawing variation.

**Network dependency:** this loads ml5.js + the DoodleNet model (a few MB)
from a CDN (`unpkg.com`) the moment a `Sketchbook` is constructed, ahead of
when anyone actually opens the book. **Test this on the actual venue wifi
before the event** — if it's unreliable, that's the case for reverting to
the offline $P approach instead.

**API gotcha that cost real debugging time:** ml5 v1.x ("ml5-next-gen") is
a promise-based rewrite. `ml5.imageClassifier('DoodleNet', callback)` (the
pattern in most tutorials/StackOverflow answers) does **not** return a
usable classifier — you must `await ml5.imageClassifier('DoodleNet')`
instead, or `.classify` won't exist on the result yet.

**Quick Draw doesn't have a "boat" category** — the closest real categories
are `sailboat`, `speedboat`, `cruise_ship`, and `canoe`. `BOAT_ALIASES` in
`Sketchbook.js` maps any of the four to "boat".

**Matching checks the top 3 predictions, not just #1.** Real testing
against a genuine sailboat drawing repeatedly showed "sailboat" landing as
an extremely close #2 (e.g. 23.2% vs a #1 of 23.8% for something unrelated)
rather than a clear miss — requiring an exact top-1 hit was too strict for
that pattern. Clearly-wrong drawings didn't have the expected shape
anywhere in their top results at all in any test, so this doesn't loosen
false-positive risk; it just stops penalizing near-misses that are
genuinely close calls for the model.

**What actually reads well to the model** (confirmed by testing real and
synthetic drawings directly against the classifier):

- `ladder` (rails + rungs) and `strawberry` (a rounded, not elongated,
  body — wide at top, tapering to a point — dotted with small seed marks)
  both hit 95-99% confidence easily and reliably.
- `bridge` is trickier: a plain two-post beam bridge reads as
  "table"/"fence"/"bench" instead. What worked best was a **suspension
  bridge silhouette** — two towers, a deck, diagonal cables — and
  confidence rose further when something below implied a gap being
  crossed (a ground/water line). This isn't a bug — it's a mismatch
  between our default mental image of "bridge" and how the dataset's
  real doodlers drew it.
- `boat` is the most brittle of the four: a well-drawn sailboat can swing
  between ~24% confidence (correctly top-1) and being confidently
  misread as something unrelated (cactus, chandelier, kangaroo) based on
  fairly small proportional differences — e.g. hull curve depth, or
  drawing two overlapping sails vs. one. The top-3 check above absorbs
  some of this, but boat likely deserves the most real human playtesting
  attention of the four.

`CONFIDENCE_THRESHOLD = 0.15` in `Sketchbook.js` requires a real, leading
signal (chance alone across 345 categories is ~0.3%) without being so
strict it rejects genuine near-misses. This was validated against real
confidence numbers, not guessed — but all of the above testing used my own
synthetic/scripted drawings, not real people, and small manual
reconstructions of a screenshot proved to be an unreliable proxy for
someone's actual strokes (tiny coordinate differences swung predictions
wildly). Do a real human playtest pass before the event. If confidence
still feels wrong for a given shape after that, the fix is the same
process: draw several real correct and incorrect examples, log
`results.slice(0, 3)` from `_submit()`'s console output, and see where the
gap actually sits — don't just nudge the constant blind.

## Wiring up real Tripo credentials

Copy `.env.example` to `.env.local` and fill in the values you get at
check-in:

```
VITE_TRIPO_API_KEY=...
VITE_TRIPO_API_URL=...
```

`src/tripo.js` has a `callTripoApi` stub marked with `TODO(hackathon-day)`
comments — its request/response shape is an unverified guess and **must**
be corrected against Tripo's real docs once you have them. It currently
sends the sketch as a PNG blob and expects a model URL back; update the
fetch call and swap in `THREE.GLTFLoader` to load the real returned model
instead of the placeholder mesh.
