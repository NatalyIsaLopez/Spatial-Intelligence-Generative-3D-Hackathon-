"use client";

import { useEffect, useRef, useState } from "react";
import {
  MOTION_BY_TOOL,
  REST_POSE,
  idlePose,
  pickPose,
  travelPose,
  type MotionOptions,
  type Pose,
  type Vec3,
} from "@/lib/game";
import type { GameState } from "@/lib/game";

export interface UseCharacterPoseOptions extends MotionOptions {
  /** Where the character stands before crossing. */
  from?: Vec3;
  /** Where it lands. Default is 6 units along +X. */
  to?: Vec3;
}

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const ACROSS: Vec3 = { x: 6, y: 0, z: 0 };

/**
 * Drives the character's transform off game state, one update per frame.
 *
 * The pose lives in React state, so the component re-renders each frame while
 * the character is moving and stops when it settles. If you are rendering with
 * three.js, prefer reading poseRef.current inside your own frame loop instead —
 * it updates without triggering React.
 */
export function useCharacterPose(state: GameState, options: UseCharacterPoseOptions = {}) {
  const { from = ORIGIN, to = ACROSS, ...motion } = options;

  const [pose, setPose] = useState<Pose>(REST_POSE);
  const poseRef = useRef<Pose>(REST_POSE);
  const phaseStartedAt = useRef<number>(0);
  const lastPickAt = useRef<number>(-Infinity);
  const pickCount = useRef<number>(0);

  // Restart the clock whenever the phase changes.
  useEffect(() => {
    phaseStartedAt.current = performance.now();
  }, [state.phase]);

  // Fire the pick reaction when the tally goes up.
  useEffect(() => {
    if (state.harvest.picked > pickCount.current) {
      lastPickAt.current = performance.now();
    }
    pickCount.current = state.harvest.picked;
  }, [state.harvest.picked]);

  const phase = state.phase;
  const traverseMs = state.level?.obstacle.traverseMs ?? 0;
  const tool = state.level?.solution.tool;

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - phaseStartedAt.current;
      let next: Pose;

      if (phase === "traversing" && traverseMs > 0) {
        const style = tool ? MOTION_BY_TOOL[tool] : "hop";
        next = travelPose(elapsed / traverseMs, from, to, traverseMs, style, motion);
      } else if (phase === "harvesting" || phase === "cleared") {
        const sincePick = now - lastPickAt.current;
        next = sincePick < 260 ? pickPose(sincePick, to) : idlePose(elapsed, to);
      } else {
        next = idlePose(elapsed, from);
      }

      poseRef.current = next;
      setPose(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, traverseMs, tool]);

  return { pose, poseRef };
}
