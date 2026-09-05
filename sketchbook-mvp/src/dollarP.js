// Original implementation of the $P Point-Cloud gesture recognizer algorithm,
// described in: Vatavu, R.D., Anthony, L. and Wobbrock, J.O. (2012).
// "Gestures as point clouds: a $P recognizer for user interface prototypes."
// Proceedings of ICMI '12. The $-family algorithms are published under the
// New BSD License (free for commercial and non-commercial use). This file is
// a from-scratch implementation of the published algorithm, not a copy of
// any particular reference source.
//
// Point clouds are order- and stroke-count-independent, which fits a game
// where players may draw a shape (e.g. a bridge) in any number of strokes,
// in any order.

const RESAMPLE_POINTS = 32;
const SIZE = 250;

/**
 * @typedef {{x: number, y: number}} Point
 * @typedef {{name: string, points: Point[]}} Template
 */

function pathLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Resamples a combined point sequence to exactly n evenly-spaced points. */
function resample(points, n) {
  if (points.length < 2) return points.slice();
  const totalLength = pathLength(points) || 1;
  const interval = totalLength / (n - 1);
  let d = 0;
  const newPoints = [points[0]];
  const src = points.slice();

  for (let i = 1; i < src.length; i++) {
    const prev = src[i - 1];
    const curr = src[i];
    const segLen = distance(prev, curr);

    if (d + segLen >= interval) {
      const t = (interval - d) / segLen;
      const nx = prev.x + t * (curr.x - prev.x);
      const ny = prev.y + t * (curr.y - prev.y);
      const newPoint = { x: nx, y: ny };
      newPoints.push(newPoint);
      src.splice(i, 0, newPoint);
      d = 0;
    } else {
      d += segLen;
    }
  }

  while (newPoints.length < n) newPoints.push(points[points.length - 1]);
  return newPoints.slice(0, n);
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

function translateToOrigin(points) {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

/**
 * Uniform scale to fit within a size x size box, preserving aspect ratio.
 * The published $P algorithm scales non-uniformly (independently in x and
 * y) to fill the full square, which works well for fixed UI gestures but
 * badly over-penalizes our case: players draw the same "bridge" concept at
 * very different width-to-height proportions (a wide flat bridge vs. a
 * narrow tall one), and non-uniform stretch distorts those into very
 * different internal shapes. Preserving aspect ratio keeps a loosely-drawn
 * bridge recognizable as the same shape regardless of its proportions.
 */
function scaleToSquare(points, size) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = size / Math.max(w, h);
  return points.map((p) => ({
    x: (p.x - minX) * scale,
    y: (p.y - minY) * scale,
  }));
}

/**
 * Splits a point budget across strokes proportionally to each stroke's own
 * arc length, with a minimum per stroke, so no single stroke is skipped.
 */
function allocatePointCounts(strokes, total) {
  const minPerStroke = 2;
  const lengths = strokes.map(pathLength);
  const totalLen = lengths.reduce((a, b) => a + b, 0) || 1;
  const remaining = Math.max(0, total - minPerStroke * strokes.length);

  const counts = lengths.map((len) => minPerStroke + Math.floor(remaining * (len / totalLen)));
  const shortfall = total - counts.reduce((a, b) => a + b, 0);
  const longestIndex = lengths.indexOf(Math.max(...lengths));
  counts[longestIndex] += shortfall;
  return counts;
}

/**
 * Normalizes raw strokes into a $P-ready point cloud. Resamples each stroke
 * independently (rather than concatenating strokes before resampling) so no
 * artificial "teleport" segment between strokes pollutes the point cloud.
 */
export function normalize(strokes) {
  const validStrokes = strokes.filter((s) => s.length >= 2);
  if (validStrokes.length === 0) return [];

  const counts = allocatePointCounts(validStrokes, RESAMPLE_POINTS);
  const combined = validStrokes.flatMap((stroke, i) => resample(stroke, counts[i]));
  const scaled = scaleToSquare(combined, SIZE);
  return translateToOrigin(scaled);
}

/** Greedy cloud match: approximate minimum-cost point correspondence. */
function greedyCloudMatch(points1, points2) {
  const n = points1.length;
  const eps = 0.5;
  const step = Math.floor(Math.pow(n, 1 - eps));
  let minDistance = Infinity;

  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(points1, points2, i);
    const d2 = cloudDistance(points2, points1, i);
    minDistance = Math.min(minDistance, d1, d2);
  }
  return minDistance;
}

function cloudDistance(points1, points2, startIndex) {
  const n = points1.length;
  const matched = new Array(n).fill(false);
  let sum = 0;
  let i = startIndex;

  do {
    let minDist = Infinity;
    let bestIndex = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = distance(points1[i], points2[j]);
      if (d < minDist) {
        minDist = d;
        bestIndex = j;
      }
    }
    matched[bestIndex] = true;
    const weight = 1 - ((i - startIndex + n) % n) / n;
    sum += weight * minDist;
    i = (i + 1) % n;
  } while (i !== startIndex);

  return sum;
}

/**
 * Recognizes a freshly-drawn set of strokes against a list of templates.
 * @param {Point[][]} strokes - raw strokes as drawn (array of point arrays)
 * @param {Template[]} templates - pre-recorded, already-normalized templates
 * @returns {{ name: string | null, score: number, distance: number }}
 */
export function recognize(strokes, templates) {
  if (templates.length === 0) return { name: null, score: 0, distance: Infinity };

  const candidate = normalize(strokes);
  let best = { name: null, distance: Infinity };

  for (const template of templates) {
    const d = greedyCloudMatch(candidate, template.points);
    if (d < best.distance) best = { name: template.name, distance: d };
  }

  // Convert raw point-cloud distance into a rough 0-1 confidence score.
  // Calibrated empirically (see debug script used during development): for
  // a "bridge" template, even an extremely deformed but still bridge-shaped
  // drawing (wildly different width-to-height proportions) landed around
  // distance ~440, while genuinely different shapes (a triangle, a random
  // scribble) landed at ~610-1035. MAX_DISTANCE sits comfortably in that
  // gap. Re-run that calibration if you change RESAMPLE_POINTS, SIZE, or
  // the target shape's silhouette.
  const MAX_DISTANCE = 550;
  const score = Math.max(0, 1 - best.distance / MAX_DISTANCE);

  return { name: best.name, score, distance: best.distance };
}

/** Builds a storable template from raw strokes (normalizes once, up front). */
export function makeTemplate(name, strokes) {
  return { name, points: normalize(strokes) };
}
