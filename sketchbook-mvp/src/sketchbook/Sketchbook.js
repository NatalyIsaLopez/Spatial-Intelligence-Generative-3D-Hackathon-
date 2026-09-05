import './sketchbook.css';

// The closed icon: a small illustrated field journal with brass corners, a
// wax seal, a leaf sprig, and a bookmark ribbon.
const ICON_SVG = `
<div class="sb-ring"></div>
<svg viewBox="0 0 84 84" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sbCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c3dab2"/>
      <stop offset="55%" stop-color="#a3c491"/>
      <stop offset="100%" stop-color="#8fae82"/>
    </linearGradient>
    <linearGradient id="sbPageGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbf6e6"/>
      <stop offset="100%" stop-color="#e9dcae"/>
    </linearGradient>
    <linearGradient id="sbBrassGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6e2ab"/>
      <stop offset="100%" stop-color="#d9a75c"/>
    </linearGradient>
    <radialGradient id="sbSealGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fbe7b8"/>
      <stop offset="100%" stop-color="#d9a75c"/>
    </radialGradient>
  </defs>
  <ellipse cx="44" cy="78" rx="28" ry="4" fill="#000" opacity="0.14"/>
  <rect x="10" y="8" width="7" height="62" rx="2" fill="url(#sbPageGrad)"/>
  <rect x="12" y="6" width="58" height="66" rx="7" fill="url(#sbCoverGrad)"/>
  <rect x="12" y="6" width="58" height="66" rx="7" fill="none" stroke="#6b8a5e" stroke-width="1"/>
  <rect x="19" y="13" width="44" height="52" rx="3" fill="none" stroke="#f3ecc9" stroke-width="1" opacity="0.45"/>
  <path d="M14,8 L14,20 A6,6 0 0 1 20,14 L20,8 Z" fill="url(#sbBrassGrad)" stroke="#b5893f" stroke-width="0.6"/>
  <circle cx="17" cy="17" r="1.6" fill="#b5893f"/>
  <path d="M68,8 L68,20 A6,6 0 0 0 62,14 L62,8 Z" fill="url(#sbBrassGrad)" stroke="#b5893f" stroke-width="0.6"/>
  <circle cx="65" cy="17" r="1.6" fill="#b5893f"/>
  <path d="M14,72 L14,60 A6,6 0 0 0 20,66 L20,72 Z" fill="url(#sbBrassGrad)" stroke="#b5893f" stroke-width="0.6"/>
  <circle cx="17" cy="63" r="1.6" fill="#b5893f"/>
  <path d="M68,72 L68,60 A6,6 0 0 1 62,66 L62,72 Z" fill="url(#sbBrassGrad)" stroke="#b5893f" stroke-width="0.6"/>
  <circle cx="65" cy="63" r="1.6" fill="#b5893f"/>
  <circle cx="33" cy="19" r="1.8" fill="#5c4a3a"/>
  <circle cx="51" cy="19" r="1.8" fill="#5c4a3a"/>
  <path d="M36 24 Q42 27.5 48 24" stroke="#5c4a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="28" cy="22.5" rx="3.2" ry="2" fill="#f4c2c2" opacity="0.8"/>
  <ellipse cx="56" cy="22.5" rx="3.2" ry="2" fill="#f4c2c2" opacity="0.8"/>
  <path d="M16,26 L68,50" stroke="#6b5645" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
  <path d="M16,26 L68,50" stroke="#8a6f57" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  <rect x="36" y="33" width="12" height="10" rx="2" fill="url(#sbBrassGrad)" stroke="#b5893f" stroke-width="0.6" transform="rotate(24 42 38)"/>
  <circle cx="42" cy="38" r="9" fill="url(#sbSealGrad)" stroke="#b5893f" stroke-width="1"/>
  <path d="M42,32 C38,35 38,41 42,44 C46,41 46,35 42,32 Z" fill="#c99a5c"/>
  <path class="sb-leaf-sprig" d="M56,16 C63,13 68,18 65,25 C60,22 56,22 53,27 C50,20 50,18 56,16 Z" fill="#f0c975" stroke="#d9a75c" stroke-width="0.6"/>
  <path d="M56,16 C63,13 68,18 65,25" fill="none" stroke="#b5893f" stroke-width="1"/>
  <g class="sb-bookmark-tail" transform="translate(30,6)">
    <path d="M0,0 L10,0 L10,16 L5,11 L0,16 Z" fill="#e08f96" stroke="#c46b73" stroke-width="0.6"/>
  </g>
</svg>`;

const FRAME_TOP_SVG = `<svg class="sb-frame-top" viewBox="0 0 520 22" preserveAspectRatio="none">
  <path d="M0,12 C60,3 100,19 160,10 C220,1 260,18 320,10 C380,2 420,18 480,9 L520,12" fill="none" stroke="var(--sb-leaf)" stroke-width="1.1" opacity="0.55"/>
  <circle cx="60" cy="6" r="2.6" fill="var(--sb-leaf)" opacity="0.5"/>
  <circle cx="220" cy="3" r="2.6" fill="var(--sb-honey)" opacity="0.6"/>
  <circle cx="380" cy="5" r="2.6" fill="var(--sb-leaf)" opacity="0.5"/>
  <circle cx="460" cy="10" r="2.6" fill="var(--sb-honey)" opacity="0.6"/>
</svg>`;
const FRAME_BOTTOM_SVG = `<svg class="sb-frame-bottom" viewBox="0 0 520 22" preserveAspectRatio="none">
  <path d="M0,12 C60,3 100,19 160,10 C220,1 260,18 320,10 C380,2 420,18 480,9 L520,12" fill="none" stroke="var(--sb-leaf)" stroke-width="1.1" opacity="0.55"/>
  <circle cx="120" cy="6" r="2.6" fill="var(--sb-honey)" opacity="0.6"/>
  <circle cx="280" cy="4" r="2.6" fill="var(--sb-leaf)" opacity="0.5"/>
  <circle cx="420" cy="9" r="2.6" fill="var(--sb-honey)" opacity="0.6"/>
</svg>`;
const FRAME_LEFT_SVG = `<svg class="sb-frame-left" viewBox="0 0 22 400" preserveAspectRatio="none">
  <path d="M12,0 C3,50 19,90 10,150 C1,210 18,250 10,310 C2,360 18,380 12,400" fill="none" stroke="var(--sb-leaf)" stroke-width="1.1" opacity="0.5"/>
  <circle cx="6" cy="90" r="2.6" fill="var(--sb-honey)" opacity="0.55"/>
  <circle cx="5" cy="260" r="2.6" fill="var(--sb-leaf)" opacity="0.5"/>
</svg>`;
const FRAME_RIGHT_SVG = `<svg class="sb-frame-right" viewBox="0 0 22 400" preserveAspectRatio="none">
  <path d="M12,0 C3,50 19,90 10,150 C1,210 18,250 10,310 C2,360 18,380 12,400" fill="none" stroke="var(--sb-leaf)" stroke-width="1.1" opacity="0.5"/>
  <circle cx="6" cy="130" r="2.6" fill="var(--sb-honey)" opacity="0.55"/>
  <circle cx="5" cy="300" r="2.6" fill="var(--sb-leaf)" opacity="0.5"/>
</svg>`;

function cornerMedallionSvg(cls) {
  return `<svg class="sb-corner-medallion ${cls}" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="none" stroke="var(--sb-honey)" stroke-width="1"/><path d="M11,5 C8,8 8,14 11,17 C14,14 14,8 11,5 Z" fill="var(--sb-leaf)" opacity="0.7"/></svg>`;
}

const RIBBON_SVG = `<svg class="sb-ribbon" viewBox="0 0 26 48"><path d="M0,0 H26 V40 L13,29 L0,40 Z" fill="var(--sb-leaf)"/><path d="M0,0 H26 V40 L13,29 L0,40 Z" fill="none" stroke="var(--sb-leaf-deep)" stroke-width="0.6"/><circle cx="13" cy="10" r="3" fill="var(--sb-honey)"/></svg>`;

const STEP_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.2 6.8H21l-5.6 4.1 2.1 6.7L12 16.5l-5.5 4.1 2.1-6.7L3 9.8h6.8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
const STEP_LINE_SVG = `<svg viewBox="0 0 22 6"><path d="M0,3 Q11,-2 22,3" stroke="var(--sb-leaf)" stroke-width="1" fill="none" opacity="0.6"/></svg>`;

const MEDALLION_SVG = `<svg class="sb-medallion" viewBox="0 0 56 56">
  <defs>
    <radialGradient id="sbMedGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#f3cf8f"/>
      <stop offset="60%" stop-color="#dfa24a"/>
      <stop offset="100%" stop-color="#b97a2c"/>
    </radialGradient>
  </defs>
  <circle cx="28" cy="28" r="27" fill="url(#sbMedGrad)" stroke="#a9702a" stroke-width="1"/>
  <circle cx="28" cy="28" r="22" fill="none" stroke="#fff" stroke-width="1" opacity="0.4"/>
  <circle cx="28" cy="28" r="22" fill="none" stroke="#8a5f1e" stroke-width="0.6" stroke-dasharray="1.5 3"/>
  <path d="M28,15 L31,24 L40,24 L33,30 L36,39 L28,33 L20,39 L23,30 L16,24 L25,24 Z" fill="none" stroke="#5a3d16" stroke-width="2"/>
</svg>`;
const MEDALLION_TAILS_SVG = `<svg class="sb-medallion-tails" viewBox="0 0 32 22">
  <path d="M8,0 L14,0 L11,20 Z" fill="var(--sb-leaf)" opacity="0.9"/>
  <path d="M18,0 L24,0 L21,18 Z" fill="var(--sb-leaf-deep)" opacity="0.9"/>
</svg>`;

const DIVIDER_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c-3 3-3 6 0 9 3-3 3-6 0-9zM12 12c-3 3-3 6 0 9 3-3 3-6 0-9z" fill="var(--sb-leaf)"/></svg>`;
const QUILL_CORNER_SVG = `<svg class="sb-quill-corner" viewBox="0 0 34 34"><path d="M4,30 L22,12" stroke="#6b4a2f" stroke-width="2" stroke-linecap="round"/><path d="M22,12 C26,8 30,8 30,4 C26,4 26,8 22,12 Z" fill="#8a6640"/><circle cx="4" cy="30" r="2" fill="#3a2c1a" opacity="0.6"/></svg>`;

const HINT_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.5.4.8.9.8 1.5V16h5.4v-.6c0-.6.3-1.1.8-1.5A6 6 0 0012 3z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const UNDO_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CLEAR_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const SUBMIT_LEAF_SVG = `<svg class="sb-leaf-accent" viewBox="0 0 24 24" fill="none"><path d="M12 3c-3 3-3 6 0 9 3-3 3-6 0-9z" fill="#3a230a"/></svg>`;
const SUBMIT_ARROW_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#3a230a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ML5_SRC = 'https://unpkg.com/ml5@1/dist/ml5.min.js';

// DoodleNet is trained on Google's Quick, Draw! categories, which don't
// include a generic "boat" — the closest real categories are these. Any of
// them counts as our "boat".
const BOAT_ALIASES = new Set(['sailboat', 'speedboat', 'cruise_ship', 'canoe']);

function mapDoodleLabelToShape(label) {
  if (BOAT_ALIASES.has(label)) return 'boat';
  return label;
}

// Confidence is a softmax probability across 345 categories, not a
// distance — a correct top-1 guess often sits well below 50% simply
// because there are so many classes to separate. Starting point; retune
// with real drawings the same way as anything else here (draw several
// real and wrong examples, log confidences, find a gap).
const CONFIDENCE_THRESHOLD = 0.15;
const HINT_CONFIDENCE_FLOOR = 0.04;

// Deliberately generic — never name the target shape. The mockup UI this
// was ported from used level-specific copy ("Cross the river", instructions
// describing a bridge); that would leak exactly the answer the player is
// supposed to guess by talking to NPCs, so both are genericized here.
const TITLE_LINES = ['Something Is Missing', 'Mend the Gap', "What Belongs Here?"];
const INSTRUCTION_LINES = [
  'The owl watches. Draw what belongs here, then hand your sketch over.',
  'Something in this place is unfinished. Sketch it, then submit.',
  'Close your eyes, picture what is missing, and draw it below.',
];
const DEFAULT_HINT = 'Ask someone nearby for a clue.';

// Pastel honey / blush / sage — matched to the kawaii palette in sketchbook.css.
const SPARKLE_COLORS = ['#f0c975', '#f4c2c2', '#a3c491'];

let ml5LoadPromise = null;
function loadMl5Once() {
  if (window.ml5) return Promise.resolve(window.ml5);
  if (ml5LoadPromise) return ml5LoadPromise;

  ml5LoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ML5_SRC;
    script.onload = () => resolve(window.ml5);
    script.onerror = () => reject(new Error(`Failed to load ml5.js from ${ML5_SRC}`));
    document.head.appendChild(script);
  });
  return ml5LoadPromise;
}

/**
 * An illustrated field-journal sketch UI: a closed journal icon (wax seal,
 * brass corners, leaf sprig) opens into a glass-and-parchment panel with a
 * progress trail, a textured drawing canvas, and hint/undo/clear/submit
 * controls. Deliberately reveals nothing about what the player is supposed
 * to draw — that's discovered by talking to NPCs elsewhere in the game.
 * The host tells this component what currently counts as correct via
 * `setExpectedShape(name)`; everything else (which level, in what order,
 * what the hint text should say) is the host's responsibility, not this
 * component's — see the optional `onHint` constructor option.
 *
 * Recognition uses ml5.js's DoodleNet (a classifier pretrained on Google's
 * Quick, Draw! dataset — tens of thousands of real human doodles per
 * category), loaded from a CDN on construction. Needs the player to have
 * internet access when the sketchbook first loads the model (a few MB);
 * test on the actual venue wifi ahead of time.
 *
 * A hidden dev bar (URL flag `?dev=1`) shows what's currently expected and
 * lets you jump the expected shape directly for testing — never shown to
 * players.
 */
export class Sketchbook {
  /**
   * @param {{
   *   shapes: string[],
   *   onMatch?: (shapeName: string) => void,
   *   onHint?: (shapeName: string) => string,
   * }} options
   */
  constructor({ shapes, onMatch, onHint }) {
    this.shapes = shapes;
    this.onMatch = onMatch || (() => {});
    this.onHint = onHint || (() => DEFAULT_HINT);
    this.expectedShape = null;
    this.devMode = new URLSearchParams(window.location.search).has('dev');
    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;
    this.classifier = null;
    this.modelReady = false;

    this._buildDom();
    this._wireEvents();
    if (this.devMode) {
      this._renderDevTabs();
      window.__sketchbook = this; // dev-only console access, e.g. __sketchbook.classifier
    }
    this._setIdleFeedback();
    this._loadModel();
  }

  open() {
    this.root.classList.add('sb-open');
  }

  close() {
    this.root.classList.remove('sb-open');
  }

  isOpen() {
    return this.root.classList.contains('sb-open');
  }

  /**
   * Tells the sketchbook what currently counts as a correct drawing. The
   * host (level/NPC logic) owns this decision entirely — e.g. on level 1
   * only "bridge" should be passed here, so drawing a boat instead fails
   * even though a boat is a perfectly valid shape in the abstract.
   */
  setExpectedShape(shapeName) {
    if (!this.shapes.includes(shapeName)) {
      console.warn(`[sketchbook] setExpectedShape: "${shapeName}" is not in the configured shape list.`);
    }
    this.expectedShape = shapeName;
    this._clearDrawing();
    this._renderProgress();
    if (this.devMode) {
      this.devExpectedEl.textContent = `expecting: ${shapeName}`;
      this._renderDevTabs();
    }
  }

  async _loadModel() {
    try {
      const ml5 = await loadMl5Once();
      // ml5-next-gen (v1.x) is promise-based: the constructor must be
      // awaited to get the real classifier — passing a callback the old
      // (ml5 v0.x) way returns something else, which doesn't have
      // .classify() on it yet.
      this.classifier = await ml5.imageClassifier('DoodleNet');
      this.modelReady = true;
      if (this.devMode) this._setIdleFeedback();
    } catch (err) {
      console.error('[sketchbook] failed to load DoodleNet:', err);
    }
  }

  _buildDom() {
    const root = document.createElement('div');
    root.className = 'sb-root';

    root.innerHTML = `
      <div class="sb-dev-bar">
        <span class="sb-dev-label">dev:</span>
        <div class="sb-dev-tabs"></div>
        <span class="sb-dev-expected"></span>
      </div>

      <button class="sb-icon-btn" type="button" aria-label="Open sketchbook">${ICON_SVG}</button>

      <div class="sb-scrim"></div>

      <div class="sb-panel-wrap">
        <div class="sb-panel" role="dialog" aria-label="Sketchbook">
          <div class="sb-grain"></div>
          ${FRAME_TOP_SVG}${FRAME_BOTTOM_SVG}${FRAME_LEFT_SVG}${FRAME_RIGHT_SVG}
          ${cornerMedallionSvg('sb-tl')}${cornerMedallionSvg('sb-bl')}${cornerMedallionSvg('sb-br')}
          ${RIBBON_SVG}
          <button class="sb-close-btn" type="button" aria-label="Close sketchbook">&times;</button>

          <div class="sb-progress-row"></div>

          <div class="sb-header-row">
            <div class="sb-medallion-wrap">
              ${MEDALLION_SVG}
              ${MEDALLION_TAILS_SVG}
            </div>
            <div>
              <p class="sb-level-tag"></p>
              <h1 class="sb-title"></h1>
              <svg class="sb-title-flourish" viewBox="0 0 130 10"><path d="M0,5 Q30,-2 65,5 Q100,12 130,5" stroke="var(--sb-honey-deep)" stroke-width="1" fill="none" opacity="0.6"/></svg>
            </div>
          </div>

          <div class="sb-divider"><div class="sb-line"></div>${DIVIDER_ICON_SVG}<div class="sb-line"></div></div>

          <p class="sb-instruction"></p>

          <div class="sb-canvas-frame">
            <canvas class="sb-canvas"></canvas>
            ${QUILL_CORNER_SVG}
          </div>

          <div class="sb-btn-row">
            <button class="sb-seal-btn sb-hint-btn" type="button" aria-label="Hint">
              <span class="sb-tip">Show a hint</span>
              ${HINT_ICON_SVG}
            </button>
            <button class="sb-seal-btn sb-undo-btn" type="button" aria-label="Undo">
              <span class="sb-tip">Undo last stroke</span>
              ${UNDO_ICON_SVG}
            </button>
            <button class="sb-seal-btn sb-clear-btn" type="button" aria-label="Clear">
              <span class="sb-tip">Clear page</span>
              ${CLEAR_ICON_SVG}
            </button>
            <button class="sb-primary-btn sb-submit-btn" type="button">
              ${SUBMIT_LEAF_SVG}
              <span>Submit drawing</span>
              ${SUBMIT_ARROW_SVG}
            </button>
          </div>

          <div class="sb-feedback"></div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this.root = root;

    this.devTabsEl = root.querySelector('.sb-dev-tabs');
    this.devExpectedEl = root.querySelector('.sb-dev-expected');
    this.iconBtn = root.querySelector('.sb-icon-btn');
    this.scrim = root.querySelector('.sb-scrim');
    this.panel = root.querySelector('.sb-panel');
    this.closeBtn = root.querySelector('.sb-close-btn');
    this.progressRowEl = root.querySelector('.sb-progress-row');
    this.levelTagEl = root.querySelector('.sb-level-tag');
    this.titleEl = root.querySelector('.sb-title');
    this.instructionEl = root.querySelector('.sb-instruction');
    this.canvasFrame = root.querySelector('.sb-canvas-frame');
    this.canvas = root.querySelector('.sb-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.hintBtn = root.querySelector('.sb-hint-btn');
    this.undoBtn = root.querySelector('.sb-undo-btn');
    this.clearBtn = root.querySelector('.sb-clear-btn');
    this.submitBtn = root.querySelector('.sb-submit-btn');
    this.feedbackEl = root.querySelector('.sb-feedback');

    // Fixed backing resolution, scaled responsively via CSS — the canvas's
    // internal pixel size never needs to track layout/animation timing.
    // Input coordinates are corrected by the actual displayed-vs-backing
    // ratio at the moment of each pointer event (see _addPoint), which
    // sidesteps the whole class of "canvas draws below the cursor" bugs
    // that come from trying to keep backing resolution in sync with a
    // possibly-still-animating layout size.
    this.canvas.width = 600;
    this.canvas.height = 300;

    this.titleEl.textContent = TITLE_LINES[Math.floor(Math.random() * TITLE_LINES.length)];
    this.instructionEl.textContent = INSTRUCTION_LINES[Math.floor(Math.random() * INSTRUCTION_LINES.length)];
    this._buildProgressRow();
    this._renderProgress();
    this._render();

    root.classList.toggle('sb-dev', this.devMode);
  }

  _buildProgressRow() {
    const parts = this.shapes.map((_, i) => {
      const step = `
        <div class="sb-step" data-step-index="${i}">
          <div class="sb-step-circle">${STEP_ICON_SVG}</div>
          <div class="sb-step-label">${i + 1}</div>
        </div>`;
      const line = i < this.shapes.length - 1 ? `<div class="sb-step-line">${STEP_LINE_SVG}</div>` : '';
      return step + line;
    });
    this.progressRowEl.innerHTML = parts.join('');
    this.stepEls = Array.from(this.progressRowEl.querySelectorAll('.sb-step'));
  }

  /** Marks steps before the current shape as done, the current one active — never names the shapes. */
  _renderProgress() {
    const currentIndex = this.shapes.indexOf(this.expectedShape);
    this.stepEls.forEach((el, i) => {
      el.classList.toggle('sb-done', currentIndex >= 0 && i < currentIndex);
      el.classList.toggle('sb-active', i === currentIndex);
    });
    const total = this.shapes.length;
    const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 1;
    this.levelTagEl.textContent = `Level ${displayIndex} of ${total}`;
  }

  _wireEvents() {
    this.iconBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.scrim.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    window.addEventListener('pointerup', () => this._onPointerUp());

    this.hintBtn.addEventListener('click', () => this._showHint());
    this.undoBtn.addEventListener('click', () => this._undo());
    this.clearBtn.addEventListener('click', () => this._clearDrawing());
    this.submitBtn.addEventListener('click', () => this._submit());
  }

  /** Dev-only: click a shape chip to jump straight to expecting it, for quick manual testing. */
  _renderDevTabs() {
    this.devTabsEl.innerHTML = '';
    for (const shape of this.shapes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sb-dev-tab' + (shape === this.expectedShape ? ' sb-active' : '');
      btn.textContent = shape;
      btn.addEventListener('click', () => this.setExpectedShape(shape));
      this.devTabsEl.appendChild(btn);
    }
  }

  _setIdleFeedback() {
    this.feedbackEl.className = 'sb-feedback';
    if (this.devMode && !this.modelReady) {
      this.feedbackEl.textContent = '[dev] loading DoodleNet…';
      return;
    }
    this.feedbackEl.textContent = '';
  }

  _showHint() {
    this.feedbackEl.className = 'sb-feedback sb-hint';
    this.feedbackEl.textContent = this.onHint(this.expectedShape);
  }

  _onPointerDown(e) {
    this.isDrawing = true;
    this.currentStroke = [];
    this.strokes.push(this.currentStroke);
    this.canvas.setPointerCapture(e.pointerId);
    this._addPoint(e);
    this._render();
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    this._addPoint(e);
    this._render();
    if (Math.random() < 0.35) this._spawnSparkle(e.clientX, e.clientY);
  }

  _onPointerUp() {
    this.isDrawing = false;
    this.currentStroke = null;
  }

  _addPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.currentStroke.push({ x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
  }

  _spawnSparkle(clientX, clientY) {
    const rect = this.canvasFrame.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'sb-sparkle';
    el.style.left = `${clientX - rect.left}px`;
    el.style.top = `${clientY - rect.top}px`;
    el.style.background = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
    this.canvasFrame.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  _compassRose(cx, cy, r, alpha) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const len = i % 2 === 0 ? r : r * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  _paperBackground() {
    const { ctx, canvas } = this;
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#fbf6e6');
    g.addColorStop(1, '#f0e6c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 250; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    ctx.restore();
    this._compassRose(canvas.width - 48, canvas.height - 48, 30, 0.06);
  }

  /** Renders the aged-paper background plus every stroke onto the visible canvas. */
  _render() {
    const { ctx } = this;
    this._paperBackground();
    ctx.strokeStyle = '#3a2c1a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of this.strokes) {
      if (stroke.length === 0) continue;
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#3a2c1a';
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }

  _undo() {
    this.strokes.pop();
    this.feedbackEl.className = 'sb-feedback';
    this.feedbackEl.textContent = '';
    this._render();
  }

  _clearDrawing() {
    this.strokes = [];
    this.currentStroke = null;
    this.feedbackEl.className = 'sb-feedback';
    this.feedbackEl.textContent = '';
    this._render();
  }

  _hasDrawing() {
    return this.strokes.some((s) => s.length >= 1);
  }

  /**
   * Renders the current strokes onto a fresh offscreen canvas in the format
   * DoodleNet expects: white background, bold black strokes, the drawing
   * fit-and-centered into the frame — NOT the visible paper-textured canvas.
   */
  _buildClassificationCanvas() {
    const SIZE = 280;
    const PADDING = 30;
    const off = document.createElement('canvas');
    off.width = SIZE;
    off.height = SIZE;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const allPoints = this.strokes.flat();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const scale = (SIZE - PADDING * 2) / Math.max(w, h);
    const offsetX = (SIZE - w * scale) / 2;
    const offsetY = (SIZE - h * scale) / 2;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const stroke of this.strokes) {
      if (stroke.length === 0) continue;
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(offsetX + (stroke[0].x - minX) * scale, offsetY + (stroke[0].y - minY) * scale, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(offsetX + (stroke[0].x - minX) * scale, offsetY + (stroke[0].y - minY) * scale);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(offsetX + (stroke[i].x - minX) * scale, offsetY + (stroke[i].y - minY) * scale);
      }
      ctx.stroke();
    }

    return off;
  }

  async _submit() {
    this.feedbackEl.className = 'sb-feedback';
    if (!this._hasDrawing()) {
      this.feedbackEl.textContent = 'Draw something first.';
      return;
    }

    this.submitBtn.disabled = true;
    this.feedbackEl.textContent = '...';

    if (!this.modelReady || !this.classifier) {
      // Model still loading (or failed) — wait briefly rather than fail silently.
      await loadMl5Once().catch(() => {});
      if (!this.modelReady) {
        this.submitBtn.disabled = false;
        this.feedbackEl.textContent = this.devMode
          ? '[dev] DoodleNet not ready yet — try again in a moment.'
          : 'Hmm. Doesn’t feel right yet.';
        return;
      }
    }

    const classificationCanvas = this._buildClassificationCanvas();
    let results;
    try {
      results = await this.classifier.classify(classificationCanvas);
    } catch (err) {
      console.error('[sketchbook] classification failed:', err);
      this.submitBtn.disabled = false;
      this.feedbackEl.textContent = "Hmm. Doesn't feel right yet.";
      return;
    }

    const top = results[0];
    console.log('[sketchbook] top predictions:', results.slice(0, 3), 'expected:', this.expectedShape);

    // Accept a match anywhere in the top few predictions, not just #1.
    // Real testing showed the correct shape repeatedly landing as an
    // extremely close #2 (e.g. 23.2% vs a #1 of 23.8%) rather than a clear
    // miss — requiring an exact top-1 hit was too strict for that pattern.
    // Clearly-wrong drawings didn't have the expected shape anywhere in
    // their top results at all, so this doesn't loosen false-positive risk.
    const TOP_K = 3;
    const match = results
      .slice(0, TOP_K)
      .find((r) => mapDoodleLabelToShape(r.label) === this.expectedShape && r.confidence >= CONFIDENCE_THRESHOLD);

    setTimeout(() => {
      this.submitBtn.disabled = false;

      if (match) {
        this.feedbackEl.className = 'sb-feedback sb-hint';
        this.feedbackEl.textContent = 'Yes — that feels right.';
        this._clearDrawing();
        this.onMatch(this.expectedShape);
      } else if (top.confidence >= HINT_CONFIDENCE_FLOOR) {
        this.feedbackEl.textContent = "That doesn't belong here.";
      } else {
        this.feedbackEl.textContent = "Hmm. Doesn't feel right yet.";
      }
    }, 300);
  }
}
