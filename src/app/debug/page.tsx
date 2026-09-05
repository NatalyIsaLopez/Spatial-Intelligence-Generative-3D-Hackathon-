"use client";

/**
 * Debug harness. Not the game UI — a control panel for proving the engine,
 * the models, and the motion all work together in a browser.
 *
 * Visit /debug. Delete this file before you ship.
 */

import { useEffect, useState } from "react";
import Script from "next/script";
import { useGame } from "@/hooks/useGame";
import { useCharacterPose } from "@/hooks/useCharacterPose";
import {
  CHARACTER_MODEL,
  PREBAKED_MODELS,
  createPrebakedGenerator,
  fruitModelFor,
  toCssTransform,
} from "@/lib/game";


const panel: React.CSSProperties = {
  border: "1px solid #333",
  borderRadius: 8,
  padding: 16,
  background: "#141414",
};

const button: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#222",
  color: "#eee",
  cursor: "pointer",
  fontSize: 14,
};

export default function DebugPage() {
  const [prompt, setPrompt] = useState("a wooden bridge");
  const [useLiveMint, setUseLiveMint] = useState(false);

  const game = useGame({
    generate: useLiveMint ? undefined : createPrebakedGenerator({ delayMs: 900 }),
    live: useLiveMint,
  });

  const { state } = game;
  const { pose } = useCharacterPose(state);

  const tool = state.level?.solution.tool;
  const toolModel = state.sketch?.modelUrl ?? (tool ? PREBAKED_MODELS[tool] : null);
  const showToolModel = ["traversing", "harvesting", "cleared"].includes(state.phase);

  // Prefill the prompt with a correct answer whenever the level changes, so
  // clicking through is fast. Clear it to test rejections.
  useEffect(() => {
    if (state.phase === "briefing" && state.level) {
      setPrompt(state.level.solution.accept[0]);
    }
  }, [state.levelIndex, state.phase, state.level]);

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        strategy="afterInteractive"
      />

      <main
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          background: "#0d0d0d",
          color: "#eee",
          minHeight: "100vh",
          padding: 24,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          alignItems: "start",
        }}
      >
        {/* ---------- Stage ---------- */}
        <section style={{ ...panel, minHeight: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <strong>Stage</strong>
            <span style={{ color: "#888" }}>
              {state.level ? `Level ${state.level.id} — ${state.level.name}` : "no level"}
            </span>
          </div>

          <div
            style={{
              position: "relative",
              height: 420,
              background: "linear-gradient(#1b2430, #0f1620)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {showToolModel && toolModel && !toolModel.startsWith("stub://") && (
              <model-viewer
                src={toolModel}
                alt="generated object"
                camera-controls
                shadow-intensity="1"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0.55,
                }}
              />
            )}

            {/* Character. The transform is the bounce. */}
            <div
              style={{
                position: "absolute",
                left: "12%",
                bottom: 40,
                width: 140,
                height: 180,
                transform: toCssTransform(pose, 60),
                transformOrigin: "50% 100%",
                transition: "none",
              }}
            >
              <model-viewer
                src={CHARACTER_MODEL}
                alt="main character"
                disable-zoom
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Fruit on the bush, one model per remaining piece. */}
            {state.phase === "harvesting" && fruitModelFor(state.level?.harvest.fruit) && (
              <div
                style={{
                  position: "absolute",
                  right: 24,
                  bottom: 60,
                  width: 280,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  justifyContent: "flex-end",
                }}
              >
                {Array.from({ length: state.harvest.remaining }).map((_, i) => (
                  <model-viewer
                    key={i}
                    src={fruitModelFor(state.level!.harvest.fruit)!}
                    alt="fruit"
                    disable-zoom
                    style={{ width: 46, height: 46 }}
                  />
                ))}
              </div>
            )}

            <div style={{ position: "absolute", left: 12, top: 12, fontSize: 12, color: "#7fd" }}>
              phase: {state.phase}
            </div>
          </div>

          <pre style={{ fontSize: 11, color: "#888", marginTop: 12, marginBottom: 0 }}>
            pose y={pose.position.y.toFixed(3)} x={pose.position.x.toFixed(2)}{" "}
            scaleY={pose.scale.y.toFixed(3)} tilt={pose.tilt.toFixed(3)}
          </pre>
        </section>

        {/* ---------- Controls ---------- */}
        <section style={{ display: "grid", gap: 16 }}>
          <div style={panel}>
            <strong>Controls</strong>

            <label style={{ display: "block", margin: "12px 0", fontSize: 13, color: "#aaa" }}>
              <input
                type="checkbox"
                checked={useLiveMint}
                onChange={(e) => setUseLiveMint(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              call Mint for real (reload after changing)
            </label>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {state.phase === "idle" && (
                <button style={button} onClick={game.start}>
                  Start
                </button>
              )}

              {(state.phase === "briefing" || state.phase === "rejected") && (
                <button style={button} onClick={game.openSketchbook}>
                  Open sketchbook
                </button>
              )}

              {state.phase === "sketching" && (
                <>
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="what did you draw?"
                    style={{
                      flex: "1 1 100%",
                      padding: 8,
                      background: "#111",
                      border: "1px solid #444",
                      borderRadius: 6,
                      color: "#eee",
                      fontFamily: "inherit",
                    }}
                  />
                  <button style={button} onClick={() => game.submitSketch(prompt)}>
                    Submit sketch
                  </button>
                  <button style={button} onClick={() => game.submitSketch("a rubber duck")}>
                    Submit a wrong one
                  </button>
                </>
              )}

              {state.phase === "harvesting" && (
                <button
                  style={{ ...button, background: "#2d4", color: "#062", fontWeight: 700 }}
                  onClick={game.pick}
                >
                  Pick ({state.harvest.remaining} left)
                </button>
              )}

              {state.phase === "cleared" && (
                <button style={button} onClick={game.nextLevel}>
                  Next level
                </button>
              )}

              <button style={{ ...button, marginLeft: "auto" }} onClick={game.reset}>
                Reset
              </button>
            </div>
          </div>

          {/* ---------- Live state ---------- */}
          <div style={panel}>
            <strong>State</strong>
            <table style={{ width: "100%", fontSize: 13, marginTop: 8, borderSpacing: "0 4px" }}>
              <tbody>
                <Row label="phase" value={state.phase} />
                <Row label="level" value={state.level?.name ?? "—"} />
                <Row label="must draw" value={state.level?.solution.label ?? "—"} />
                <Row label="attempts" value={String(state.attempts)} />
                <Row label="picked" value={String(state.harvest.picked)} />
                <Row label="remaining" value={String(state.harvest.remaining)} />
                <Row label="seconds left" value={String(game.secondsLeft)} />
                <Row label="total score" value={String(state.totalScore)} />
                <Row label="model" value={state.sketch?.modelUrl ?? "—"} />
              </tbody>
            </table>

            {state.phase === "harvesting" && (
              <div style={{ height: 6, background: "#222", borderRadius: 3, marginTop: 10 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${game.harvestProgress * 100}%`,
                    background: game.harvestProgress > 0.3 ? "#2d4" : "#e64",
                    borderRadius: 3,
                  }}
                />
              </div>
            )}
          </div>

          {/* ---------- Messages ---------- */}
          {(state.rejection || state.error) && (
            <div
              style={{
                ...panel,
                borderColor: state.error ? "#a33" : "#a83",
                color: state.error ? "#f99" : "#fc8",
                fontSize: 13,
              }}
            >
              <strong>{state.error ? "Generation failed" : "Sketch rejected"}</strong>
              <p style={{ margin: "8px 0 0" }}>{state.error ?? state.rejection}</p>
            </div>
          )}

          {/* ---------- Scores ---------- */}
          {state.scores.length > 0 && (
            <div style={panel}>
              <strong>Scores</strong>
              {state.scores.map((s) => (
                <div key={s.levelId} style={{ fontSize: 13, marginTop: 6, color: "#bbb" }}>
                  L{s.levelId} · {s.picked} {s.fruit} · {s.fruitPoints} pts
                  {s.retryPenalty > 0 && ` − ${s.retryPenalty} retry`} = <b>{s.total}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: "#777", paddingRight: 12, whiteSpace: "nowrap" }}>{label}</td>
      <td style={{ wordBreak: "break-all" }}>{value}</td>
    </tr>
  );
}
