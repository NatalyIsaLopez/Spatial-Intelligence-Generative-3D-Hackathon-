import type { Phase, ToolId } from "./types";

/**
 * Character motion, as pure functions of time.
 *
 * character.glb has no animation clips, so movement is driven by transforms.
 * Nothing here touches the DOM or three.js: feed it a timestamp, get back a
 * pose, apply that pose however your renderer likes.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Pose {
  position: Vec3;
  /** Facing, in radians. 0 looks down +Z. */
  rotationY: number;
  /** Forward tilt in radians. Leans into the hop. */
  tilt: number;
  /** Squash and stretch. Volume is preserved, so the bounce reads as weight. */
  scale: Vec3;
}

export type MotionStyle = "hop" | "bob" | "climb";

export interface MotionOptions {
  /** Hops per second while travelling. */
  hopRate?: number;
  /** Peak hop height in world units. */
  hopHeight?: number;
  /** 0 disables squash and stretch. 0.35 is lively without being cartoonish. */
  squash?: number;
  /** Peak forward lean in radians. */
  lean?: number;
}

const DEFAULTS: Required<MotionOptions> = {
  hopRate: 2.2,
  hopHeight: 0.45,
  squash: 0.35,
  lean: 0.12,
};

export const REST_POSE: Pose = {
  position: { x: 0, y: 0, z: 0 },
  rotationY: 0,
  tilt: 0,
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * Standing still, but alive. A slow shallow bounce so the character never
 * looks frozen between levels.
 */
export function idlePose(elapsedMs: number, at: Vec3 = { x: 0, y: 0, z: 0 }): Pose {
  const t = elapsedMs / 1000;
  const breath = Math.sin(t * 1.8);
  return {
    position: { x: at.x, y: at.y + breath * 0.03, z: at.z },
    rotationY: 0,
    tilt: 0,
    scale: { x: 1, y: 1 + breath * 0.02, z: 1 },
  };
}

/**
 * Moving from one point to another with a bouncing gait.
 *
 * progress runs 0 to 1 across the whole crossing. The number of hops is
 * derived from hopRate and how long the crossing lasts, so a longer bridge
 * gets more hops rather than slower ones.
 */
export function travelPose(
  progress: number,
  from: Vec3,
  to: Vec3,
  durationMs: number,
  style: MotionStyle = "hop",
  options: MotionOptions = {},
): Pose {
  const opts = { ...DEFAULTS, ...options };
  const p = clamp01(progress);

  const position: Vec3 = {
    x: lerp(from.x, to.x, p),
    y: lerp(from.y, to.y, p),
    z: lerp(from.z, to.z, p),
  };

  const facing = Math.atan2(to.x - from.x, to.z - from.z);

  if (style === "bob") {
    // Riding the boat: no ground contact, so a slow swell rather than hops.
    const t = (p * durationMs) / 1000;
    const swell = Math.sin(t * 1.6);
    const roll = Math.sin(t * 1.1);
    return {
      position: { ...position, y: position.y + swell * 0.08 },
      rotationY: facing,
      tilt: roll * 0.05,
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  const hops = Math.max(1, Math.round((durationMs / 1000) * opts.hopRate));
  const hopProgress = (p * hops) % 1;

  // 0 on the ground, 1 at the top of the arc.
  const air = Math.sin(Math.PI * hopProgress);

  // Climbing a ladder: hops are vertical and tighter, with no forward lean.
  const heightScale = style === "climb" ? 0.5 : 1;
  const y = position.y + opts.hopHeight * heightScale * air;

  // Stretch at the apex, squash on contact. Volume held constant so the
  // character does not appear to change mass.
  const scaleY = 1 + opts.squash * (air * 0.6 - (1 - air) * 0.4);
  const scaleXZ = 1 / Math.sqrt(scaleY);

  // Lean forward through the middle of each hop, upright at contact.
  const tilt = style === "climb" ? 0 : opts.lean * Math.sin(Math.PI * hopProgress);

  return {
    position: { ...position, y },
    rotationY: facing,
    tilt,
    scale: { x: scaleXZ, y: scaleY, z: scaleXZ },
  };
}

/**
 * A quick anticipation-and-pop when the player picks fruit. Feed it ms since
 * the pick landed; it settles back to rest after about 260ms.
 */
export function pickPose(msSincePick: number, at: Vec3 = { x: 0, y: 0, z: 0 }): Pose {
  const duration = 260;
  if (msSincePick >= duration) return { ...REST_POSE, position: at };

  const t = msSincePick / duration;
  const pop = Math.sin(Math.PI * t);
  return {
    position: { x: at.x, y: at.y + pop * 0.18, z: at.z },
    rotationY: 0,
    tilt: 0,
    scale: { x: 1 - pop * 0.08, y: 1 + pop * 0.14, z: 1 - pop * 0.08 },
  };
}

/** Which gait suits each level's obstacle. */
export const MOTION_BY_TOOL: Record<ToolId, MotionStyle> = {
  bridge: "hop",
  ladder: "climb",
  boat: "bob",
};

/**
 * Where the character sits during each phase, as a fraction of the crossing.
 * Renderers can use this to place the character without tracking it themselves.
 */
export function restingProgressFor(phase: Phase): number {
  switch (phase) {
    case "harvesting":
    case "cleared":
      return 1;
    case "traversing":
      return 0;
    default:
      return 0;
  }
}

/**
 * Turns a pose into a CSS transform, for a DOM or model-viewer renderer.
 * `unit` scales world units into pixels.
 */
export function toCssTransform(pose: Pose, unit = 100): string {
  const { position: p, scale: s } = pose;
  return [
    `translate3d(${p.x * unit}px, ${-p.y * unit}px, ${p.z * unit}px)`,
    `rotateZ(${pose.tilt}rad)`,
    `scale3d(${s.x}, ${s.y}, ${s.z})`,
  ].join(" ");
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
