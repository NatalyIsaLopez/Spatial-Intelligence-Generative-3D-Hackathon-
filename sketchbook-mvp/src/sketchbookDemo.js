import { Sketchbook } from './sketchbook/Sketchbook.js';

// Isolated test harness for the Sketchbook component, on a blank background.
// Level/progression logic belongs to the host game, not the component —
// this harness simulates it locally just so the loop is testable:
// bridge -> ladder -> boat -> strawberry, one "level" at a time.
const LEVELS = ['bridge', 'ladder', 'boat', 'strawberry'];
let levelIndex = 0;

const sketchbook = new Sketchbook({
  shapes: LEVELS,
  onMatch: (shape) => {
    console.log(`[demo] correct: ${shape} (level ${levelIndex + 1}/${LEVELS.length})`);
    levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    sketchbook.setExpectedShape(LEVELS[levelIndex]);
    console.log(`[demo] now expecting (dev-eyes-only): ${LEVELS[levelIndex]}`);
  },
});

sketchbook.setExpectedShape(LEVELS[levelIndex]);
console.log(`[demo] now expecting (dev-eyes-only): ${LEVELS[levelIndex]}`);
console.log('[demo] add ?dev=1 to the URL to reveal the template-recording panel.');
