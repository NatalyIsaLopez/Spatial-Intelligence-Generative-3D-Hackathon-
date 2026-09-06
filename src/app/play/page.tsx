"use client";

/**
 * Spatial Forge — the game screen.
 *
 * The 3D world fills the viewport; everything here is HUD layered over it.
 * The sketchbook is deliberately absent: submitting is one call to
 * submitSketch(prompt), and the caption field stands in for it.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { createPrebakedGenerator } from "@/lib/game";

// three.js has no business in the server bundle.
const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => <div className="sf-loading">Building the world…</div>,
});

const PLATE = ["I", "II", "III"];

export default function PlayPage() {
  const game = useGame({ generate: createPrebakedGenerator({ delayMs: 1400 }) });
  const { state, secondsLeft, harvestProgress } = game;

  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const level = state.level;

  useEffect(() => {
    if (state.phase === "sketching") {
      setCaption("");
      inputRef.current?.focus();
    }
  }, [state.phase]);

  const urgent = state.phase === "harvesting" && harvestProgress < 0.3;
  const last = state.scores[state.scores.length - 1];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Spline+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{css}</style>

      <main className="sf">
        <div className="sf-world">
          <Scene state={state} onPick={game.pick} />
        </div>

        {/* ---------------- top bar ---------------- */}
        <header className="sf-top">
          <div className="sf-chip">
            {level ? (
              <>
                <span className="sf-numeral">{PLATE[state.levelIndex]}</span>
                {level.name}
              </>
            ) : (
              "Spatial Forge"
            )}
          </div>

          <div className="sf-chip sf-chip--score">
            {state.scores.map((s) => (
              <span key={s.levelId} className="sf-pip" />
            ))}
            <span className="sf-scorenum">{state.totalScore}</span>
          </div>
        </header>

        {/* ---------------- countdown ---------------- */}
        {state.phase === "harvesting" && (
          <div className={`sf-clock ${urgent ? "is-urgent" : ""}`}>
            <div className="sf-seconds">{secondsLeft}</div>
            <div className="sf-ring">
              <div className="sf-ring-fill" style={{ width: `${harvestProgress * 100}%` }} />
            </div>
            <div className="sf-count">
              {state.harvest.picked} · {state.harvest.remaining} left
            </div>
          </div>
        )}

        {/* ---------------- prompt ---------------- */}
        <footer className="sf-bottom">
          {state.phase === "idle" && (
            <Card>
              <h1 className="sf-title">Spatial Forge</h1>
              <p className="sf-body">
                Three crossings stand between you and the watermelon. Draw what gets you over.
              </p>
              <button className="sf-btn" onClick={game.start}>
                Set out
              </button>
            </Card>
          )}

          {(state.phase === "briefing" || state.phase === "rejected") && level && (
            <Card>
              <p className="sf-body">{level.obstacle.brief}</p>
              {state.rejection && <p className="sf-hint">{state.rejection}</p>}
              {state.error && <p className="sf-hint sf-hint--bad">{state.error}</p>}
              <button className="sf-btn" onClick={game.openSketchbook}>
                {state.attempts > 0 ? "Draw again" : "Draw something"}
              </button>
            </Card>
          )}

          {state.phase === "sketching" && level && (
            <Card>
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
                  className="sf-btn"
                  onClick={() => game.submitSketch(caption)}
                  disabled={!caption.trim()}
                >
                  Build it
                </button>
              </div>
            </Card>
          )}

          {state.phase === "generating" && (
            <Card>
              <p className="sf-body sf-pulse">Forging {caption || "your object"}…</p>
            </Card>
          )}

          {state.phase === "traversing" && level && (
            <Card>
              <p className="sf-body">Crossing {level.obstacle.label}.</p>
            </Card>
          )}

          {state.phase === "cleared" && last && (
            <Card>
              <div className="sf-tally">
                <span>{last.picked} picked</span>
                <span className="sf-dim">{last.fruitPoints}</span>
                {last.retryPenalty > 0 && <span className="sf-minus">−{last.retryPenalty}</span>}
                <strong className="sf-big">{last.total}</strong>
              </div>
              <button className="sf-btn" onClick={game.nextLevel}>
                {state.levelIndex < 2 ? "Onward" : "Finish"}
              </button>
            </Card>
          )}

          {state.phase === "finished" && (
            <Card>
              <h1 className="sf-title">{state.totalScore}</h1>
              <p className="sf-body">All three crossings behind you.</p>
              <button className="sf-btn" onClick={game.reset}>
                Go again
              </button>
            </Card>
          )}
        </footer>
      </main>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="sf-card">{children}</div>;
}

const css = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow: hidden; }

.sf {
  --ink: #17212B;
  --paper: #FFFFFF;
  --sun: #FFC63D;
  --leaf: #4CAF3D;
  --berry: #E8503A;
  position: fixed;
  inset: 0;
  font-family: "Spline Sans", ui-sans-serif, system-ui, sans-serif;
  color: var(--ink);
  user-select: none;
}

.sf-world { position: absolute; inset: 0; }
.sf-loading {
  display: grid; place-items: center; height: 100%;
  background: #8FD3F4; color: #17212B;
  font-family: "Baloo 2", cursive; font-size: 22px;
}

/* ---------- chips ---------- */
.sf-top {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 18px 20px; pointer-events: none;
}
.sf-chip {
  display: flex; align-items: center; gap: 10px;
  background: var(--paper);
  border-radius: 999px;
  padding: 9px 20px;
  font-family: "Baloo 2", cursive;
  font-size: 18px; font-weight: 700;
  box-shadow: 0 4px 0 rgba(23,33,43,.18);
}
.sf-numeral { color: var(--berry); font-size: 15px; }
.sf-chip--score { gap: 6px; }
.sf-pip { width: 9px; height: 9px; border-radius: 50%; background: var(--leaf); }
.sf-scorenum { font-variant-numeric: tabular-nums; margin-left: 4px; }

/* ---------- countdown ---------- */
.sf-clock {
  position: absolute; top: 74px; right: 20px;
  text-align: center; pointer-events: none;
  background: var(--paper);
  border-radius: 20px;
  padding: 12px 18px 14px;
  box-shadow: 0 5px 0 rgba(23,33,43,.18);
  min-width: 128px;
}
.sf-seconds {
  font-family: "Baloo 2", cursive;
  font-size: 46px; font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sf-ring { height: 6px; background: rgba(23,33,43,.12); border-radius: 3px; margin: 8px 0 6px; overflow: hidden; }
.sf-ring-fill { height: 100%; background: var(--leaf); border-radius: 3px; transition: width .1s linear; }
.sf-count { font-size: 12px; opacity: .6; }
.sf-clock.is-urgent { animation: sf-shake .5s ease-in-out infinite; }
.sf-clock.is-urgent .sf-seconds { color: var(--berry); }
.sf-clock.is-urgent .sf-ring-fill { background: var(--berry); }
@keyframes sf-shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* ---------- prompt card ---------- */
.sf-bottom {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; justify-content: center;
  padding: 0 20px 26px;
  pointer-events: none;
}
.sf-card {
  pointer-events: auto;
  background: var(--paper);
  border-radius: 22px;
  padding: 22px 26px;
  width: min(560px, 100%);
  box-shadow: 0 6px 0 rgba(23,33,43,.18);
}
.sf-title {
  font-family: "Baloo 2", cursive;
  font-size: 34px; font-weight: 800;
  margin: 0 0 8px;
}
.sf-body { font-size: 16px; line-height: 1.55; margin: 0 0 16px; }
.sf-hint { font-size: 15px; line-height: 1.5; margin: 0 0 16px; color: #B8541F; }
.sf-hint--bad { color: var(--berry); }
.sf-label { display: block; font-size: 13px; opacity: .6; margin-bottom: 8px; }
.sf-row { display: flex; gap: 10px; }

.sf-input {
  flex: 1;
  border: 2px solid rgba(23,33,43,.14);
  border-radius: 14px;
  padding: 12px 16px;
  font: inherit; font-size: 16px;
  color: var(--ink);
  background: #F7F9FA;
}
.sf-input:focus { outline: none; border-color: var(--leaf); background: #fff; }

.sf-btn {
  font-family: "Baloo 2", cursive;
  font-size: 18px; font-weight: 700;
  color: #fff;
  background: var(--leaf);
  border: 0;
  border-radius: 14px;
  padding: 12px 28px;
  cursor: pointer;
  box-shadow: 0 4px 0 #37892C;
  transition: transform .06s, box-shadow .06s;
}
.sf-btn:hover { filter: brightness(1.05); }
.sf-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #37892C; }
.sf-btn:focus-visible { outline: 3px solid var(--sun); outline-offset: 3px; }
.sf-btn:disabled { opacity: .45; cursor: not-allowed; box-shadow: 0 4px 0 #37892C; }

.sf-tally {
  display: flex; align-items: baseline; gap: 14px;
  font-size: 16px; margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}
.sf-dim { opacity: .5; }
.sf-minus { color: var(--berry); }
.sf-big { font-family: "Baloo 2", cursive; font-size: 32px; margin-left: auto; }

.sf-pulse { animation: sf-fade 1.5s ease-in-out infinite; }
@keyframes sf-fade { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .sf-pulse, .sf-clock.is-urgent { animation: none; }
}

@media (max-width: 640px) {
  .sf-row { flex-direction: column; }
  .sf-seconds { font-size: 36px; }
  .sf-clock { min-width: 104px; padding: 10px 14px 12px; }
  .sf-title { font-size: 27px; }
}
`;
