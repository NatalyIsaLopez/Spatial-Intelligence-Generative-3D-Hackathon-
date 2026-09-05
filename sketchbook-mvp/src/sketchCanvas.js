/** Handles the drawing overlay: pointer capture, stroke storage, and rendering. */
export class SketchCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    canvasEl.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    canvasEl.addEventListener('pointermove', (e) => this._onPointerMove(e));
    window.addEventListener('pointerup', () => this._onPointerUp());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._redraw();
  }

  activate() {
    this.canvas.classList.add('active');
  }

  deactivate() {
    this.canvas.classList.remove('active');
  }

  clear() {
    this.strokes = [];
    this.currentStroke = null;
    this._redraw();
  }

  /** Returns strokes as an array of point arrays: Point[][] */
  getStrokes() {
    return this.strokes;
  }

  hasDrawing() {
    return this.strokes.some((s) => s.length > 1);
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
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }
}
