import * as THREE from 'three';
import { SketchCanvas } from './sketchCanvas.js';
import { recognize } from './dollarP.js';
import { loadTemplates, addTemplate, countByName } from './templates.js';
import { generateFromSketch } from './tripo.js';
import { placeInSocket } from './placement.js';

const TARGET_SHAPE = 'bridge';
const MATCH_THRESHOLD = 0.15; // calibrated to accept loosely/differently-proportioned bridges; see dollarP.js

// ---- Three.js scene ---------------------------------------------------

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c2434);
scene.fog = new THREE.Fog(0x1c2434, 8, 30);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 3.2, 6);
camera.lookAt(0, 0.3, 0);

const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x1a1f2b, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
sun.position.set(4, 6, 3);
sun.castShadow = true;
scene.add(sun);

// Two "banks" with a gap between them — the placeholder for the river world.
const bankMaterial = new THREE.MeshStandardMaterial({ color: 0x4c5a46, roughness: 1 });
const gapWidth = 1.6;
const bankDepth = 4;
const bankWidth = 3;

function makeBank(xOffset) {
  const bank = new THREE.Mesh(new THREE.BoxGeometry(bankWidth, 0.4, bankDepth), bankMaterial);
  bank.position.set(xOffset, -0.2, 0);
  bank.receiveShadow = true;
  scene.add(bank);
}
makeBank(-(bankWidth / 2 + gapWidth / 2));
makeBank(bankWidth / 2 + gapWidth / 2);

// The socket: where a generated object should be placed and how big it should be.
const socket = {
  position: new THREE.Vector3(0, 0, 0),
  size: new THREE.Vector3(gapWidth, 0.5, bankDepth * 0.5),
};

const gapMarker = new THREE.Mesh(
  new THREE.BoxGeometry(gapWidth, 0.05, bankDepth),
  new THREE.MeshStandardMaterial({ color: 0x24303f })
);
gapMarker.position.set(0, -0.18, 0);
scene.add(gapMarker);

function resizeRenderer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resizeRenderer();
window.addEventListener('resize', resizeRenderer);

const pendingUpdates = [];
function animate() {
  requestAnimationFrame(animate);
  for (let i = pendingUpdates.length - 1; i >= 0; i--) {
    const done = pendingUpdates[i]();
    if (done) pendingUpdates.splice(i, 1);
  }
  renderer.render(scene, camera);
}
animate();

// ---- Sketch + recognition + generation loop ---------------------------

const sketchEl = document.getElementById('sketch');
const sketch = new SketchCanvas(sketchEl);

const statusEl = document.getElementById('status');
const drawBtn = document.getElementById('drawBtn');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');
const recordBtn = document.getElementById('recordBtn');
const templateCountEl = document.getElementById('templateCount');

let recordMode = false;
let solved = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function refreshTemplateCount() {
  const counts = countByName(loadTemplates());
  templateCountEl.textContent = `templates: ${counts[TARGET_SHAPE] || 0}`;
}
refreshTemplateCount();

drawBtn.addEventListener('click', () => {
  if (solved) return;
  sketch.activate();
  submitBtn.disabled = false;
  clearBtn.disabled = false;
  setStatus(
    recordMode
      ? `Draw an example "${TARGET_SHAPE}" to add as a template, then Submit.`
      : 'Draw the missing piece, then hit Submit.'
  );
});

clearBtn.addEventListener('click', () => {
  sketch.clear();
});

recordBtn.addEventListener('click', () => {
  recordMode = !recordMode;
  recordBtn.textContent = recordMode ? 'Recording: ON' : 'Record Template Mode';
  setStatus(
    recordMode
      ? `Template recording on — draw a few example "${TARGET_SHAPE}" shapes.`
      : 'Draw the missing piece to cross the gap.'
  );
});

submitBtn.addEventListener('click', async () => {
  if (!sketch.hasDrawing()) return;
  const strokes = sketch.getStrokes();

  if (recordMode) {
    addTemplate(TARGET_SHAPE, strokes);
    refreshTemplateCount();
    setStatus(`Template saved. Draw another, or turn off recording to test.`);
    sketch.clear();
    return;
  }

  const templates = loadTemplates();
  if (templates.length === 0) {
    setStatus('No templates recorded yet — turn on Record Template Mode first.');
    return;
  }

  const result = recognize(strokes, templates);
  console.log('$P recognition result:', result);

  if (result.name === TARGET_SHAPE && result.score >= MATCH_THRESHOLD) {
    await handleMatch();
  } else {
    setStatus(`Hmm, that doesn't look like it (score: ${result.score.toFixed(2)}). Try again.`);
    sketch.clear();
  }
});

async function handleMatch() {
  sketch.deactivate();
  submitBtn.disabled = true;
  clearBtn.disabled = true;
  setStatus('Recognized! Generating...');

  const object = await generateFromSketch(sketchEl, { onStatus: setStatus });
  scene.add(object);
  const update = placeInSocket(object, socket);
  pendingUpdates.push(update);

  solved = true;
  drawBtn.disabled = true;
  setStatus('The gap is mended. (MVP loop complete: drawn -> recognized -> generated -> placed.)');
  sketch.clear();
}
