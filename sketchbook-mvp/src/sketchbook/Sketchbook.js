import './sketchbook.css';

// A small sleeping owl perched on a branch — the closed/idle icon. Wakes up
// (see OWL_AWAKE_SVG) once the glade opens, a tiny bit of storytelling.
const OWL_SLEEPING_SVG = `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 41 Q24 37 41 41" stroke="#6b4a33" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="27" rx="14" ry="15" fill="#6f8f68"/>
  <ellipse cx="24" cy="31" rx="9" ry="9" fill="#efe6cb"/>
  <circle cx="24" cy="16" r="11" fill="#5c8a52"/>
  <path d="M15 9 L18 15 L12 14 Z" fill="#5c8a52"/>
  <path d="M33 9 L30 15 L36 14 Z" fill="#5c8a52"/>
  <path d="M17 16 Q19.5 18.2 22 16" stroke="#33502f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M26 16 Q28.5 18.2 31 16" stroke="#33502f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M22.5 20 L24 23.5 L25.5 20 Z" fill="#e8b84b"/>
</svg>`;

// The awake owl, perched atop the glade panel once it's open — watching over the sketch.
const OWL_AWAKE_SVG = `
<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 46 Q13 58 20 72" stroke="#456b40" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M60 46 Q67 58 60 72" stroke="#456b40" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="40" cy="48" rx="22" ry="24" fill="#6f8f68"/>
  <ellipse cx="40" cy="54" rx="14" ry="15" fill="#f3ead0"/>
  <circle cx="40" cy="28" r="18" fill="#5c8a52"/>
  <path d="M24 14 L30 26 L19 24 Z" fill="#5c8a52"/>
  <path d="M56 14 L50 26 L61 24 Z" fill="#5c8a52"/>
  <circle cx="32" cy="27" r="7.4" fill="#fff8ea"/>
  <circle cx="48" cy="27" r="7.4" fill="#fff8ea"/>
  <circle cx="32" cy="27" r="3.6" fill="#2f2115"/>
  <circle cx="48" cy="27" r="3.6" fill="#2f2115"/>
  <circle cx="33.4" cy="25.6" r="1.1" fill="#fff8ea"/>
  <circle cx="49.4" cy="25.6" r="1.1" fill="#fff8ea"/>
  <path d="M37 32 L40 37.5 L43 32 Z" fill="#e8b84b"/>
</svg>`;

// Small leaf sprig ornaments, replacing the old book's gold corner flourishes.
const LEAF_SVG = `
<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 28 Q6 14 20 4" stroke="#5c8a52" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="9" cy="19" rx="5" ry="2.6" fill="#7ea86f" transform="rotate(-35 9 19)"/>
  <ellipse cx="16" cy="10" rx="4" ry="2.2" fill="#8fbb7e" transform="rotate(-35 16 10)"/>
</svg>`;

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

const FLAVOR_LINES = [
  'The owl watches. Draw what belongs here.',
  'Something in this glade is unfinished.',
  'Sketch the missing item!',
];

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
 * A forest-glade sketch UI: a sleeping owl icon that opens into a
 * firefly-lit clearing where an awake owl companion watches over a single
 * blank drawing page. Deliberately reveals nothing about what the player
 * is supposed to draw — that's discovered by talking to NPCs elsewhere in
 * the game. The host tells this component what currently counts as correct
 * via `setExpectedShape(name)`; everything else (which level, in what
 * order) is the host's responsibility, not this component's.
 *
 * Recognition uses ml5.js's DoodleNet (a classifier pretrained on Google's
 * Quick, Draw! dataset — tens of thousands of real human doodles per
 * category), loaded from a CDN on construction. This replaced an earlier
 * from-scratch $P point-cloud recognizer (still used by the unrelated
 * river-gap MVP in src/main.js) once hand-authoring geometric templates
 * turned into a losing game of whack-a-mole against real drawing variation
 * — DoodleNet already generalizes across that variation, no templates
 * needed. Needs the player to have internet access when the sketchbook
 * first loads the model (a few MB); test on the actual venue wifi ahead of
 * time.
 *
 * A hidden dev bar (URL flag `?dev=1`) shows what's currently expected and
 * lets you jump the expected shape directly for testing — never shown to
 * players.
 */
export class Sketchbook {
  /**
   * @param {{ shapes: string[], onMatch?: (shapeName: string) => void }} options
   */
  constructor({ shapes, onMatch }) {
    this.shapes = shapes;
    this.onMatch = onMatch || (() => {});
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
    this._setIdleStatus();
    this._loadModel();
  }

  open() {
    this.overlay.classList.add('sb-open');
    this.iconBtn.hidden = true;
    this._resizeCanvas();
    this._setIdleStatus();
  }

  close() {
    this.overlay.classList.remove('sb-open');
    this.iconBtn.hidden = false;
  }

  isOpen() {
    return this.overlay.classList.contains('sb-open');
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
      if (this.devMode) this._setIdleStatus();
    } catch (err) {
      console.error('[sketchbook] failed to load DoodleNet:', err);
    }
  }

  _buildDom() {
    const root = document.createElement('div');
    root.className = 'sb-root';

    root.innerHTML = `
      <button class="sb-icon-btn" type="button" aria-label="Open sketchbook">${OWL_SLEEPING_SVG}</button>
      <div class="sb-overlay"></div>
    `;

    document.body.appendChild(root);
    this.root = root;
    this.iconBtn = root.querySelector('.sb-icon-btn');
    this.overlay = root.querySelector('.sb-overlay');

    this._spawnMotes();

    const glade = document.createElement('div');
    glade.className = 'sb-glade';
    glade.setAttribute('role', 'dialog');
    glade.setAttribute('aria-label', 'Sketch glade');
    glade.innerHTML = `
      <div class="sb-dev-bar">
        <span class="sb-dev-label">dev:</span>
        <div class="sb-dev-tabs"></div>
        <span class="sb-dev-expected"></span>
      </div>
      <button class="sb-close-btn" type="button" aria-label="Close">✕</button>
      <div class="sb-leaf sb-leaf-tl">${LEAF_SVG}</div>
      <div class="sb-leaf sb-leaf-tr">${LEAF_SVG}</div>
      <div class="sb-owl-perch">${OWL_AWAKE_SVG}</div>
      <p class="sb-flavor"></p>
      <div class="sb-status"></div>
      <div class="sb-canvas-wrap sb-empty">
        <canvas></canvas>
      </div>
      <div class="sb-controls">
        <button class="sb-btn sb-clear-btn" type="button">Start Over</button>
        <button class="sb-btn sb-primary sb-submit-btn" type="button">Bring It to Life</button>
      </div>
    `;
    this.overlay.appendChild(glade);

    this.glade = glade;
    this.devTabsEl = glade.querySelector('.sb-dev-tabs');
    this.devExpectedEl = glade.querySelector('.sb-dev-expected');
    this.flavorEl = glade.querySelector('.sb-flavor');
    this.flavorEl.textContent = FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)];
    this.statusEl = glade.querySelector('.sb-status');
    this.canvasWrap = glade.querySelector('.sb-canvas-wrap');
    this.canvas = glade.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.clearBtn = glade.querySelector('.sb-clear-btn');
    this.submitBtn = glade.querySelector('.sb-submit-btn');
    this.closeBtn = glade.querySelector('.sb-close-btn');

    root.classList.toggle('sb-dev', this.devMode);
  }

  _spawnMotes() {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const mote = document.createElement('span');
      mote.className = 'sb-mote';
      mote.style.left = `${Math.random() * 100}%`;
      mote.style.top = `${20 + Math.random() * 60}%`;
      mote.style.animationDelay = `${Math.random() * 6}s`;
      mote.style.animationDuration = `${5 + Math.random() * 4}s`;
      this.overlay.appendChild(mote);
    }
  }

  _wireEvents() {
    this.iconBtn.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
    window.addEventListener('resize', () => this._resizeCanvas());

    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    window.addEventListener('pointerup', () => this._onPointerUp());

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

  _setIdleStatus() {
    if (this.devMode && !this.modelReady) {
      this.statusEl.textContent = '[dev] loading DoodleNet…';
      return;
    }
    this.statusEl.textContent = '';
  }

  _resizeCanvas() {
    // clientWidth/clientHeight reflect true layout size and are unaffected
    // by the book's open/close CSS transform — getBoundingClientRect() is
    // NOT, and read at the wrong instant (e.g. synchronously in open(),
    // before the scale-up transition paints) it returns the pre-animation,
    // scaled-down box. That silently under-sizes the canvas's pixel
    // buffer, and every drawn point ends up displaced once the CSS
    // width/height:100% stretches that undersized buffer back up.
    this.canvas.width = Math.max(1, this.canvasWrap.clientWidth);
    this.canvas.height = Math.max(1, this.canvasWrap.clientHeight);
    this._redraw();
  }

  _onPointerDown(e) {
    this.isDrawing = true;
    this.currentStroke = [];
    this.strokes.push(this.currentStroke);
    this._addPoint(e);
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    this._addPoint(e);
    this._redraw();
  }

  _onPointerUp() {
    this.isDrawing = false;
    this.currentStroke = null;
  }

  _addPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.currentStroke.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  _redraw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }

    this.canvasWrap.classList.toggle('sb-empty', !this._hasDrawing());
  }

  _clearDrawing() {
    this.strokes = [];
    this.currentStroke = null;
    this._redraw();
  }

  _hasDrawing() {
    return this.strokes.some((s) => s.length >= 2);
  }

  /**
   * Renders the current strokes onto a fresh offscreen canvas in the format
   * DoodleNet expects: white background, bold black strokes, the drawing
   * fit-and-centered into the frame — NOT the visible in-book canvas, which
   * stays styled for the book's own ink-on-parchment look.
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
      if (stroke.length < 2) continue;
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
    if (!this._hasDrawing()) return;

    this.submitBtn.disabled = true;
    this.statusEl.textContent = '...';

    if (!this.modelReady || !this.classifier) {
      // Model still loading (or failed) — wait briefly rather than fail silently.
      await loadMl5Once().catch(() => {});
      if (!this.modelReady) {
        this.submitBtn.disabled = false;
        this.statusEl.textContent = this.devMode
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
      this.statusEl.textContent = "Hmm. Doesn't feel right yet.";
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
        this.statusEl.textContent = 'Yes — that feels right.';
        this._clearDrawing();
        this.onMatch(this.expectedShape);
      } else if (top.confidence >= HINT_CONFIDENCE_FLOOR) {
        this.statusEl.textContent = "That doesn't belong here.";
      } else {
        this.statusEl.textContent = "Hmm. Doesn't feel right yet.";
      }
    }, 300);
  }
}
