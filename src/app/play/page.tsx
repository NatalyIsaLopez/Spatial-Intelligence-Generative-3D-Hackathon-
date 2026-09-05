"use client";

/**
 * Spatial Forge — playable screen.
 *
 * The sketchbook is deliberately absent: submitting is a single call to
 * submitSketch(prompt), and the caption field below is a stand-in for it.
 * Replace that one input when the real sketchbook lands.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { useGame } from "@/hooks/useGame";
import { useCharacterPose } from "@/hooks/useCharacterPose";
import {
  CHARACTER_MODEL,
  PREBAKED_MODELS,
  createPrebakedGenerator,
  fruitModelFor,
} from "@/lib/game";
import type { ObstacleId } from "@/lib/game";

const PLATE = ["I", "II", "III", "IV", "V"];

export default function PlayPage() {
  const game = useGame({ generate: createPrebakedGenerator({ delayMs: 1400 }) });
  const { state, secondsLeft, harvestProgress } = game;
  const { pose } = useCharacterPose(state);

  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const level = state.level;
  const tool = level?.solution.tool;
  const fruitModel = fruitModelFor(level?.harvest.fruit);

  // Character walks left to right; pose.x runs 0..6 across the crossing.
  const journey = Math.min(1, Math.max(0, pose.position.x / 6));
  const crossed = state.phase === "harvesting" || state.phase === "cleared";

  useEffect(() => {
    if (state.phase === "sketching") {
      setCaption("");
      inputRef.current?.focus();
    }
  }, [state.phase]);

  // Fruit scatter is deterministic per level, so it does not reshuffle on
  // every render while the player is picking.
  const scatter = useMemo(() => {
    const count = level?.harvest.spawnCount ?? 0;
    return Array.from({ length: count }, (_, i) => {
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12345.6789;
      return {
        left: 58 + (a - Math.floor(a)) * 34,
        bottom: 26 + (b - Math.floor(b)) * 34,
        drift: (i % 5) * 0.4,
      };
    });
  }, [level?.harvest.spawnCount, level?.id]);

  const showTool = ["traversing", "harvesting", "cleared"].includes(state.phase);
  const urgent = state.phase === "harvesting" && harvestProgress < 0.3;

  return (
    <>
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        strategy="afterInteractive"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Spline+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <style>{css}</style>

      <main className="sf">
        {/* ---------------- Header ---------------- */}
        <header className="sf-head">
          <div className="sf-plate">
            {level ? (
              <>
                <span className="sf-numeral">{PLATE[state.levelIndex]}</span>
                <span className="sf-levelname">{level.name}</span>
              </>
            ) : (
              <span className="sf-levelname">Spatial Forge</span>
            )}
          </div>

          <div className="sf-tally">
            {state.scores.map((s) => (
              <span key={s.levelId} className="sf-pip" title={`Level ${s.levelId}: ${s.total}`} />
            ))}
            <span className="sf-score">{state.totalScore}</span>
          </div>
        </header>

        {/* ---------------- Scene ---------------- */}
        <section className="sf-scene">
          <Obstacle id={level?.obstacle.id} solved={crossed || state.phase === "traversing"} />

          {/* The generated object, seated in the gap it solves. */}
          {showTool && tool && (
            <div className={`sf-tool sf-tool--${tool}`}>
              <model-viewer
                src={state.sketch?.modelUrl?.startsWith("/") ? state.sketch.modelUrl : PREBAKED_MODELS[tool]}
                alt={level?.solution.label ?? ""}
                disable-zoom
                interaction-prompt="none"
              />
            </div>
          )}

          {/* Fruit. Each one is a target. */}
          {state.phase === "harvesting" &&
            fruitModel &&
            scatter.slice(0, state.harvest.remaining).map((f, i) => (
              <button
                key={i}
                className="sf-fruit"
                style={{
                  left: `${f.left}%`,
                  bottom: `${f.bottom}%`,
                  animationDelay: `${f.drift}s`,
                }}
                onClick={game.pick}
                aria-label={`Pick ${level?.harvest.label}`}
              >
                <model-viewer src={fruitModel} alt="" disable-zoom interaction-prompt="none" />
              </button>
            ))}

          {/* Character. */}
          <div
            className="sf-walker"
            style={{
              left: `${8 + journey * 62}%`,
              transform: `translateY(${-pose.position.y * 70}px) rotate(${pose.tilt}rad) scale(${pose.scale.x}, ${pose.scale.y})`,
            }}
          >
            <model-viewer src={CHARACTER_MODEL} alt="" disable-zoom interaction-prompt="none" />
          </div>

          <div className="sf-ground" />

          {/* Countdown lives over the scene so eyes stay on the fruit. */}
          {state.phase === "harvesting" && (
            <div className={`sf-clock ${urgent ? "is-urgent" : ""}`}>
              <span className="sf-seconds">{secondsLeft}</span>
              <span className="sf-picked">
                {state.harvest.picked} picked
              </span>
              <div className="sf-bar">
                <div className="sf-bar-fill" style={{ width: `${harvestProgress * 100}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* ---------------- Prompt ---------------- */}
        <footer className="sf-foot">
          {state.phase === "idle" && (
            <Panel>
              <p className="sf-lede">
                Three crossings stand between you and the watermelon. Draw what gets you over.
              </p>
              <button className="sf-btn sf-btn--go" onClick={game.start}>
                Set out
              </button>
            </Panel>
          )}

          {(state.phase === "briefing" || state.phase === "rejected") && level && (
            <Panel>
              <p className="sf-brief">{level.obstacle.brief}</p>
              {state.rejection && <p className="sf-note">{state.rejection}</p>}
              {state.error && <p className="sf-note sf-note--bad">{state.error}</p>}
              <button className="sf-btn sf-btn--go" onClick={game.openSketchbook}>
                {state.attempts > 0 ? "Draw again" : "Draw something"}
              </button>
            </Panel>
          )}

          {state.phase === "sketching" && level && (
            <Panel>
              <label className="sf-label" htmlFor="caption">
                What did you draw?
              </label>
              <div className="sf-row">
                <input
                  id="caption"
                  ref={inputRef}
                  className="sf-input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && caption.trim() && game.submitSketch(caption)}
                  placeholder={level.solution.label}
                  autoComplete="off"
                />
                <button
                  className="sf-btn sf-btn--go"
                  onClick={() => game.submitSketch(caption)}
                  disabled={!caption.trim()}
                >
                  Build it
                </button>
              </div>
            </Panel>
          )}

          {state.phase === "generating" && (
            <Panel>
              <p className="sf-brief sf-shimmer">Forging {caption || "your object"}…</p>
            </Panel>
          )}

          {state.phase === "traversing" && level && (
            <Panel>
              <p className="sf-brief">Crossing {level.obstacle.label}.</p>
            </Panel>
          )}

          {state.phase === "cleared" && (
            <Panel>
              <Tally score={state.scores[state.scores.length - 1]} />
              <button className="sf-btn sf-btn--go" onClick={game.nextLevel}>
                {state.levelIndex < 2 ? "Onward" : "Finish"}
              </button>
            </Panel>
          )}

          {state.phase === "finished" && (
            <Panel>
              <p className="sf-lede">
                You made it across all three. {state.totalScore} points in the sack.
              </p>
              <button className="sf-btn sf-btn--go" onClick={game.reset}>
                Go again
              </button>
            </Panel>
          )}
        </footer>
      </main>
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="sf-panel">{children}</div>;
}

function Tally({ score }: { score?: { picked: number; fruitPoints: number; retryPenalty: number; total: number } }) {
  if (!score) return null;
  return (
    <div className="sf-tallyrow">
      <span>{score.picked} picked</span>
      <span className="sf-dim">{score.fruitPoints}</span>
      {score.retryPenalty > 0 && <span className="sf-minus">−{score.retryPenalty}</span>}
      <strong className="sf-total">{score.total}</strong>
    </div>
  );
}

/** Obstacles are drawn rather than modelled — cheap, and they read instantly. */
function Obstacle({ id, solved }: { id?: ObstacleId; solved: boolean }) {
  if (!id) return null;

  if (id === "crest") {
    return (
      <svg className="sf-obstacle" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
        <path d="M150 200 L215 40 L280 200 Z" fill="#2C3547" />
        <path d="M215 40 L245 118 L280 200 Z" fill="#39445A" />
        <path d="M150 200 L215 40 L280 200" fill="none" stroke="#5A6A88" strokeWidth="2" />
      </svg>
    );
  }

  const wide = id === "lake";
  return (
    <svg className="sf-obstacle" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <rect x={wide ? 150 : 175} y="150" width={wide ? 190 : 110} height="50" fill="#1D2939" />
      <g opacity={solved ? 0.5 : 1}>
        <path
          d={`M${wide ? 158 : 182} 168 q14 -7 28 0 t28 0 t28 0 t28 0 ${wide ? "t28 0 t28 0" : ""}`}
          fill="none"
          stroke="#4E7C93"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M${wide ? 164 : 188} 184 q14 -6 28 0 t28 0 t28 0 ${wide ? "t28 0 t28 0" : ""}`}
          fill="none"
          stroke="#3D6478"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

const css = `
.sf {
  --ink: #E4E9F0;
  --dusk-far: #3A4763;
  --dusk-near: #202838;
  --earth: #171D28;
  --ember: #D9552F;
  --persimmon: #E88B45;
  --rule: rgba(228,233,240,.16);
  min-height: 100vh;
  background: var(--earth);
  color: var(--ink);
  font-family: "Spline Sans", ui-sans-serif, system-ui, sans-serif;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.sf-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 20px 32px 14px;
  border-bottom: 1px solid var(--rule);
}
.sf-plate { display: flex; align-items: baseline; gap: 14px; }
.sf-numeral {
  font-family: "Fraunces", Georgia, serif;
  font-size: 15px;
  color: var(--ember);
  letter-spacing: .1em;
}
.sf-levelname {
  font-family: "Fraunces", Georgia, serif;
  font-size: 26px;
  font-weight: 600;
}
.sf-tally { display: flex; align-items: center; gap: 8px; }
.sf-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--persimmon); }
.sf-score {
  font-variant-numeric: tabular-nums;
  font-size: 20px;
  margin-left: 8px;
  font-weight: 600;
}

.sf-scene {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--dusk-far) 0%, var(--dusk-near) 62%, var(--earth) 100%);
  min-height: 58vh;
}
.sf-ground {
  position: absolute; left: 0; right: 0; bottom: 0; height: 22%;
  background: var(--earth);
  border-top: 1px solid rgba(228,233,240,.1);
}
.sf-obstacle {
  position: absolute; left: 0; right: 0; bottom: 0;
  width: 100%; height: 46%;
}

.sf-walker {
  position: absolute; bottom: 20%;
  width: 120px; height: 150px;
  transform-origin: 50% 100%;
  transition: left .12s linear;
  z-index: 3;
  pointer-events: none;
}
.sf-walker model-viewer { width: 100%; height: 100%; }

.sf-tool { position: absolute; bottom: 19%; z-index: 2; pointer-events: none; }
.sf-tool model-viewer { width: 100%; height: 100%; }
.sf-tool--bridge { left: 40%; width: 220px; height: 130px; }
.sf-tool--ladder { left: 47%; bottom: 22%; width: 150px; height: 210px; }
.sf-tool--boat   { left: 42%; width: 220px; height: 140px; }

.sf-fruit {
  position: absolute;
  width: 54px; height: 54px;
  padding: 0; border: 0; background: none;
  cursor: pointer;
  z-index: 4;
  animation: sf-hang 3.4s ease-in-out infinite;
  border-radius: 50%;
}
.sf-fruit model-viewer { width: 100%; height: 100%; pointer-events: none; }
.sf-fruit:hover { transform: scale(1.12); }
.sf-fruit:focus-visible { outline: 2px solid var(--persimmon); outline-offset: 4px; }
@keyframes sf-hang {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -6px; }
}

.sf-clock {
  position: absolute; top: 22px; right: 28px;
  text-align: right;
  z-index: 5;
}
.sf-seconds {
  display: block;
  font-family: "Fraunces", Georgia, serif;
  font-size: 52px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sf-picked { font-size: 13px; opacity: .7; }
.sf-bar { width: 130px; height: 3px; background: rgba(228,233,240,.18); margin-top: 8px; margin-left: auto; }
.sf-bar-fill { height: 100%; background: var(--persimmon); transition: width .1s linear; }
.sf-clock.is-urgent .sf-seconds { color: var(--ember); }
.sf-clock.is-urgent .sf-bar-fill { background: var(--ember); }

.sf-foot { padding: 20px 32px 30px; border-top: 1px solid var(--rule); }
.sf-panel { max-width: 620px; }
.sf-lede { font-family: "Fraunces", Georgia, serif; font-size: 21px; margin: 0 0 16px; line-height: 1.45; }
.sf-brief { font-size: 16px; margin: 0 0 16px; line-height: 1.6; opacity: .9; max-width: 52ch; }
.sf-note { font-size: 15px; margin: 0 0 16px; color: var(--persimmon); line-height: 1.55; max-width: 52ch; }
.sf-note--bad { color: var(--ember); }
.sf-label { display: block; font-size: 13px; opacity: .65; margin-bottom: 8px; }
.sf-row { display: flex; gap: 10px; }

.sf-input {
  flex: 1;
  background: rgba(228,233,240,.06);
  border: 1px solid var(--rule);
  border-radius: 3px;
  padding: 11px 14px;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}
.sf-input::placeholder { color: rgba(228,233,240,.34); }
.sf-input:focus { outline: none; border-color: var(--persimmon); }

.sf-btn {
  border: 1px solid var(--rule);
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 15px;
  padding: 11px 22px;
  border-radius: 3px;
  cursor: pointer;
}
.sf-btn:hover { border-color: var(--ink); }
.sf-btn:focus-visible { outline: 2px solid var(--persimmon); outline-offset: 2px; }
.sf-btn--go { background: var(--ember); border-color: var(--ember); color: #fff; font-weight: 500; }
.sf-btn--go:hover { background: #E4653E; border-color: #E4653E; }
.sf-btn:disabled { opacity: .4; cursor: not-allowed; }

.sf-tallyrow {
  display: flex; align-items: baseline; gap: 14px;
  font-size: 16px; margin-bottom: 18px;
  font-variant-numeric: tabular-nums;
}
.sf-dim { opacity: .55; }
.sf-minus { color: var(--ember); }
.sf-total { font-family: "Fraunces", Georgia, serif; font-size: 30px; }

.sf-shimmer { animation: sf-pulse 1.6s ease-in-out infinite; }
@keyframes sf-pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .sf-fruit, .sf-shimmer { animation: none; }
  .sf-walker { transition: none; }
}

@media (max-width: 720px) {
  .sf-head, .sf-foot { padding-left: 18px; padding-right: 18px; }
  .sf-levelname { font-size: 21px; }
  .sf-seconds { font-size: 40px; }
  .sf-row { flex-direction: column; }
  .sf-walker { width: 90px; height: 115px; }
}
`;
