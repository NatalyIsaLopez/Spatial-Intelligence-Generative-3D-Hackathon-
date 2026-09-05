/**
 * Plays the whole game with no browser and no Mint calls, so you can prove the
 * loop works before any UI exists.
 *
 *   npx tsx scripts/playthrough.ts
 */

import { GameEngine, validateSketch, LEVELS } from "../src/lib/game";

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  const mark = condition ? "  ok  " : " FAIL ";
  if (!condition) failures++;
  console.log(`[${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Validation ---------------------------------------------------------

console.log("\nSketch validation\n");

const river = LEVELS[0].solution;
const crest = LEVELS[1].solution;
const lake = LEVELS[2].solution;

check("'a wooden bridge' solves the stream", validateSketch("a wooden bridge", river).ok);
check("'BRIDGE!!!' solves the stream", validateSketch("BRIDGE!!!", river).ok);
check("'two planks' solves the stream", validateSketch("two planks", river).ok);
check("'a boat' does not solve the stream", !validateSketch("a boat", river).ok);
check(
  "a boat gets the drift hint, not the generic one",
  validateSketch("a boat", river).reason?.includes("downstream") ?? false,
);
check(
  "'bridgework' does not match on a substring",
  !validateSketch("bridgework", river).ok,
);
check(
  "'a bridge with a boat under it' passes — accept wins over near miss",
  validateSketch("a bridge with a boat under it", river).ok,
);
check("empty prompt is rejected", !validateSketch("   ", river).ok);
check("'a rope ladder' solves the crest", validateSketch("a rope ladder", crest).ok);
check("'a bridge' does not solve the crest", !validateSketch("a bridge", crest).ok);
check("'a red canoe' solves the lake", validateSketch("a red canoe", lake).ok);

// --- Full run -----------------------------------------------------------

console.log("\nFull playthrough\n");

async function play(): Promise<void> {
  const engine = new GameEngine({
    // Stand in for Mint: instant, always succeeds.
    generate: async (prompt) => `test://model/${encodeURIComponent(prompt)}`,
    skipTraversal: true,
    tickMs: 20,
  });

  engine.start();
  check("starts on level 1 briefing", engine.getState().phase === "briefing");
  check("level 1 is the stream", engine.getState().level?.obstacle.id === "river");

  // Level 1 — get it wrong once, then right.
  engine.openSketchbook();
  engine.submitSketch("a boat");
  check("wrong sketch lands in rejected", engine.getState().phase === "rejected");
  check("wrong sketch counts an attempt", engine.getState().attempts === 1);
  check("no model was requested for a wrong sketch", engine.getState().sketch?.modelUrl === null);

  engine.openSketchbook();
  engine.submitSketch("a sturdy log bridge");
  check("correct sketch starts generating", engine.getState().phase === "generating");

  await wait(30);
  check("model resolved into harvesting", engine.getState().phase === "harvesting");
  check("bush is stocked", engine.getState().harvest.remaining === 14);
  check("timer is counting", engine.getState().harvest.msLeft > 0);

  for (let i = 0; i < 6; i++) engine.pick();
  check("picked 6 strawberries", engine.getState().harvest.picked === 6);
  check("8 strawberries left", engine.getState().harvest.remaining === 8);

  engine.dispatch({ type: "END_HARVEST" });
  const level1 = engine.getState().scores[0];
  check("level 1 cleared", engine.getState().phase === "cleared");
  check("fruit points are 6 x 10", level1.fruitPoints === 60, `got ${level1.fruitPoints}`);
  check("one retry costs 25", level1.retryPenalty === 25, `got ${level1.retryPenalty}`);
  check("level 1 total is 35", level1.total === 35, `got ${level1.total}`);

  // Level 2 — first try, clear the whole bush.
  engine.nextLevel();
  check("advanced to the crest", engine.getState().level?.obstacle.id === "crest");
  check("attempts reset between levels", engine.getState().attempts === 0);

  engine.openSketchbook();
  engine.submitSketch("a tall wooden ladder");
  await wait(30);
  check("climbing into the harvest", engine.getState().phase === "harvesting");

  for (let i = 0; i < 20; i++) engine.pick();
  check("emptying the bush ends the level early", engine.getState().phase === "cleared");
  const level2 = engine.getState().scores[1];
  check("20 blueberries at 15 each", level2.fruitPoints === 300, `got ${level2.fruitPoints}`);
  check("no penalty on a first-try level", level2.retryPenalty === 0);

  engine.pick();
  check("picking after the level ends is ignored", engine.getState().harvest.picked === 20);

  // Level 3 — the golden pear.
  engine.nextLevel();
  engine.openSketchbook();
  engine.submitSketch("a small rowboat");
  await wait(30);
  check("rowing into the harvest", engine.getState().phase === "harvesting");
  check("exactly one pear on the tree", engine.getState().harvest.remaining === 1);

  engine.pick();
  check("taking the pear finishes the level", engine.getState().phase === "cleared");
  check("the pear is worth 250", engine.getState().scores[2].total === 250);

  engine.nextLevel();
  check("game reaches finished", engine.getState().phase === "finished");
  check("three levels scored", engine.getState().scores.length === 3);
  check(
    "total is 35 + 300 + 250 = 585",
    engine.getState().totalScore === 585,
    `got ${engine.getState().totalScore}`,
  );

  // Timer expiry.
  console.log("\nTimer expiry\n");
  const timed = new GameEngine({
    generate: async () => "test://model",
    skipTraversal: true,
    tickMs: 10,
    levels: [
      {
        ...LEVELS[0],
        harvest: { ...LEVELS[0].harvest, durationMs: 200 },
      },
    ],
  });

  timed.start();
  timed.openSketchbook();
  timed.submitSketch("a bridge");
  await wait(30);
  timed.pick();
  timed.pick();
  check("picked 2 before the buzzer", timed.getState().harvest.picked === 2);

  await wait(300);
  check("timer expiry ends the harvest", timed.getState().phase === "cleared");
  check("score kept what was picked", timed.getState().scores[0].total === 20);

  timed.pick();
  check("picking after time is ignored", timed.getState().harvest.picked === 2);

  timed.nextLevel();
  check("single-level run finishes", timed.getState().phase === "finished");
  timed.destroy();

  // Mint failure.
  console.log("\nModel generation failure\n");
  const broken = new GameEngine({
    generate: async () => {
      throw new Error("Mint is down");
    },
    skipTraversal: true,
  });

  broken.start();
  broken.openSketchbook();
  broken.submitSketch("a bridge");
  await wait(30);
  check("failure returns to the sketchbook", broken.getState().phase === "rejected");
  check("the reason is surfaced", broken.getState().error === "Mint is down");
  check("a Mint failure is not scored as a bad drawing", broken.getState().rejection === null);
  broken.destroy();

  engine.destroy();
}

play().then(() => {
  console.log(
    failures === 0
      ? "\nAll checks passed.\n"
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
});
