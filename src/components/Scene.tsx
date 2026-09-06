"use client";

/**
 * The 3D world. One shared scene the camera moves through, rather than
 * isolated model viewers.
 *
 * Terrain is built from primitives so it costs nothing and reads instantly:
 * chunky bevelled blocks, saturated colours, soft shadows. Your friend's
 * level art can replace TERRAIN below without touching anything else.
 */

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  BUSH_MODEL,
  CHARACTER_MODEL,
  FRUIT_MODELS,
  MOTION_BY_TOOL,
  PREBAKED_MODELS,
  idlePose,
  travelPose,
  type GameState,
  type ObstacleId,
  type ToolId,
} from "@/lib/game";

// ---------------------------------------------------------------- palette

const C = {
  grass: "#6FBF3E",
  grassDark: "#579B2E",
  soil: "#8A5A34",
  water: "#3AA7E0",
  rock: "#97A3B0",
  rockDark: "#7A8794",
  sky: "#8FD3F4",
};

// ------------------------------------------------------------- level shape

interface Terrain {
  /** Where the near platform ends and the gap begins. */
  gapStart: number;
  gapEnd: number;
  /** Height of the far platform. Level 2 climbs. */
  farHeight: number;
  water: boolean;
}

const TERRAIN: Record<ObstacleId, Terrain> = {
  river: { gapStart: -1.5, gapEnd: 2.5, farHeight: 0, water: true },
  crest: { gapStart: -1, gapEnd: 2, farHeight: 3, water: false },
  lake: { gapStart: -2, gapEnd: 6, farHeight: 0, water: true },
};

const START_X = -5;

function landingX(t: Terrain): number {
  return t.gapEnd + 2.4;
}

// ------------------------------------------------------------------ models

useGLTF.preload(CHARACTER_MODEL);
useGLTF.preload(BUSH_MODEL);
Object.values(PREBAKED_MODELS).forEach((m) => useGLTF.preload(m));

function Model({ url, scale = 1 }: { url: string; scale?: number }) {
  const { scene } = useGLTF(url);
  // Clone so the same GLB can appear more than once (fruit).
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={copy} scale={scale} />;
}

// --------------------------------------------------------------- character

function Character({ state }: { state: GameState }) {
  const group = useRef<THREE.Group>(null);
  const phaseStart = useRef(0);
  const lastPhase = useRef(state.phase);

  const terrain = TERRAIN[state.level?.obstacle.id ?? "river"];
  const tool = state.level?.solution.tool;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;

    if (lastPhase.current !== state.phase) {
      lastPhase.current = state.phase;
      phaseStart.current = clock.elapsedTime;
    }

    const elapsed = (clock.elapsedTime - phaseStart.current) * 1000;
    const from = { x: START_X, y: 0, z: 0 };
    const to = { x: landingX(terrain), y: terrain.farHeight, z: 0 };

    let pose;
    if (state.phase === "traversing" && state.level) {
      const ms = state.level.obstacle.traverseMs;
      const style = tool ? MOTION_BY_TOOL[tool] : "hop";
      pose = travelPose(Math.min(1, elapsed / ms), from, to, ms, style);
    } else if (state.phase === "harvesting" || state.phase === "cleared") {
      pose = idlePose(elapsed, to);
    } else {
      pose = idlePose(elapsed, from);
    }

    g.position.set(pose.position.x, pose.position.y, pose.position.z);
    g.scale.set(pose.scale.x, pose.scale.y, pose.scale.z);
    g.rotation.z = pose.tilt;
    g.rotation.y = Math.PI / 2;
  });

  return (
    <group ref={group}>
      <Model url={CHARACTER_MODEL} scale={1.5} />
    </group>
  );
}

// ------------------------------------------------------------------ camera

function CameraRig({ state }: { state: GameState }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(START_X, 1.5, 0));
  const terrain = TERRAIN[state.level?.obstacle.id ?? "river"];

  useFrame((_, delta) => {
    // Follow roughly where the action is, rather than the character exactly —
    // a locked follow makes the hop feel like the world is bouncing.
    const focusX =
      state.phase === "harvesting" || state.phase === "cleared"
        ? landingX(terrain)
        : state.phase === "traversing"
          ? (START_X + landingX(terrain)) / 2
          : START_X + 1;

    const focusY = state.phase === "harvesting" ? terrain.farHeight + 1.5 : 1.5;

    target.current.lerp(new THREE.Vector3(focusX, focusY, 0), 1 - Math.pow(0.005, delta));

    camera.position.lerp(
      new THREE.Vector3(target.current.x - 1.5, target.current.y + 4.5, 11),
      1 - Math.pow(0.005, delta),
    );
    camera.lookAt(target.current.x, target.current.y - 0.5, 0);
  });

  return null;
}

// ----------------------------------------------------------------- terrain

function Ground({ obstacle }: { obstacle: ObstacleId }) {
  const t = TERRAIN[obstacle];
  const nearWidth = t.gapStart - (START_X - 6);
  const farWidth = 18;

  return (
    <group>
      {/* near platform */}
      <Platform
        center={[START_X - 6 + nearWidth / 2, -0.75, 0]}
        size={[nearWidth, 1.5, 9]}
      />

      {/* far platform, raised on the crest level */}
      <Platform
        center={[t.gapEnd + farWidth / 2, t.farHeight - 0.75, 0]}
        size={[farWidth, 1.5 + t.farHeight, 9]}
      />

      {/* water in the gap */}
      {t.water && (
        <mesh position={[(t.gapStart + t.gapEnd) / 2, -1.1, 0]} receiveShadow>
          <boxGeometry args={[t.gapEnd - t.gapStart, 0.6, 9]} />
          <meshStandardMaterial
            color={C.water}
            transparent
            opacity={0.85}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* rock face on the crest level */}
      {obstacle === "crest" && (
        <>
          <RoundedBox
            args={[t.gapEnd - t.gapStart, t.farHeight + 1.5, 8]}
            radius={0.14}
            position={[(t.gapStart + t.gapEnd) / 2, (t.farHeight - 1.5) / 2, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={C.rock} roughness={0.9} />
          </RoundedBox>
          <RoundedBox
            args={[1.4, 1.2, 1.4]}
            radius={0.12}
            position={[t.gapEnd - 0.6, t.farHeight + 0.6, 2.4]}
            castShadow
          >
            <meshStandardMaterial color={C.rockDark} roughness={0.95} />
          </RoundedBox>
        </>
      )}
    </group>
  );
}

/** Grass slab with a soil underside — the classic chunky look. */
function Platform({ center, size }: { center: [number, number, number]; size: [number, number, number] }) {
  const [w, h, d] = size;
  return (
    <group position={center}>
      <RoundedBox args={[w, h, d]} radius={0.1} smoothness={2} receiveShadow castShadow>
        <meshStandardMaterial color={C.soil} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[w, 0.5, d]} radius={0.12} smoothness={2} position={[0, h / 2 - 0.1, 0]} receiveShadow>
        <meshStandardMaterial color={C.grass} roughness={0.85} />
      </RoundedBox>
    </group>
  );
}

// -------------------------------------------------------------------- tool

function ToolModel({ tool, url }: { tool: ToolId; url: string }) {
  const t = TERRAIN[tool === "ladder" ? "crest" : tool === "boat" ? "lake" : "river"];
  const mid = (t.gapStart + t.gapEnd) / 2;

  const placement: Record<ToolId, { pos: [number, number, number]; scale: number; rotY: number }> = {
    bridge: { pos: [mid, 0.1, 0], scale: 2.2, rotY: Math.PI / 2 },
    ladder: { pos: [t.gapStart + 0.4, -0.6, 1.2], scale: 2.0, rotY: Math.PI / 2 },
    boat: { pos: [mid, -0.5, 0], scale: 1.8, rotY: Math.PI / 2 },
  };
  const p = placement[tool];

  return (
    <group position={p.pos} rotation={[0, p.rotY, 0]}>
      <Model url={url} scale={p.scale} />
    </group>
  );
}

// ------------------------------------------------------------------- fruit

function FruitField({ state, onPick }: { state: GameState; onPick: () => void }) {
  const terrain = TERRAIN[state.level?.obstacle.id ?? "river"];
  const fruit = state.level?.harvest.fruit;
  const url = fruit ? FRUIT_MODELS[fruit] : null;
  const base = landingX(terrain);

  const spots = useMemo(() => {
    const n = state.level?.harvest.spawnCount ?? 0;
    return Array.from({ length: n }, (_, i) => {
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12345.6789;
      const c = Math.sin(i * 39.425) * 9876.5432;
      return {
        x: base + 2.6 + (a - Math.floor(a)) * 3.2,
        y: terrain.farHeight + 1.0 + (c - Math.floor(c)) * 2.0,
        z: -1.6 + (b - Math.floor(b)) * 3.2,
        phase: i * 0.7,
      };
    });
  }, [state.level?.harvest.spawnCount, state.level?.id, base, terrain.farHeight]);

  const showBush = state.phase === "harvesting" || state.phase === "cleared";

  return (
    <>
      {showBush && (
        <group position={[base + 4.2, terrain.farHeight, 0]}>
          <Model url={BUSH_MODEL} scale={2.6} />
        </group>
      )}
      {url &&
        state.phase === "harvesting" &&
        spots.slice(0, state.harvest.remaining).map((s, i) => (
          <Fruit key={i} url={url} spot={s} onPick={onPick} />
        ))}
    </>
  );
}

function Fruit({
  url,
  spot,
  onPick,
}: {
  url: string;
  spot: { x: number; y: number; z: number; phase: number };
  onPick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + spot.phase;
    ref.current.position.y = spot.y + Math.sin(t * 1.7) * 0.14;
    ref.current.rotation.y = t * 0.5;
  });

  return (
    <group
      ref={ref}
      position={[spot.x, spot.y, spot.z]}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <Model url={url} scale={1.1} />
    </group>
  );
}

// ------------------------------------------------------------------- scene

export default function Scene({ state, onPick }: { state: GameState; onPick: () => void }) {
  const obstacle = state.level?.obstacle.id ?? "river";
  const tool = state.level?.solution.tool;
  const toolUrl =
    state.sketch?.modelUrl?.startsWith("/") ? state.sketch.modelUrl : tool ? PREBAKED_MODELS[tool] : null;
  const showTool = ["traversing", "harvesting", "cleared"].includes(state.phase);

  return (
    <Canvas shadows camera={{ position: [-6, 6, 11], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={[C.sky]} />
      <fog attach="fog" args={[C.sky, 26, 60]} />

      <ambientLight intensity={1.1} />
      <directionalLight
        position={[8, 14, 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      <Suspense fallback={null}>
        <Ground obstacle={obstacle} />
        <Character state={state} />
        {showTool && tool && toolUrl && <ToolModel tool={tool} url={toolUrl} />}
        <FruitField state={state} onPick={onPick} />
        <Environment preset="park" environmentIntensity={0.35} />
      </Suspense>

      <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={40} blur={2.2} far={12} />
      <CameraRig state={state} />
    </Canvas>
  );
}
