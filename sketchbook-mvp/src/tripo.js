import * as THREE from 'three';

const TRIPO_API_KEY = import.meta.env.VITE_TRIPO_API_KEY;
const TRIPO_API_URL = import.meta.env.VITE_TRIPO_API_URL;

/**
 * Generates a 3D object from a sketch. Returns a THREE.Object3D.
 *
 * MVP behavior: if no Tripo credentials are configured (they're handed out
 * at hackathon check-in), falls back to a procedural placeholder mesh so
 * the recognition -> generation -> placement pipeline can be tested end to
 * end today. Once you have real credentials, fill in `callTripoApi` below
 * per Tripo's actual docs (endpoint, auth header, request/response shape) —
 * this stub's request/response shape is a guess, not verified against real
 * Tripo API documentation.
 */
export async function generateFromSketch(canvas, { onStatus } = {}) {
  if (TRIPO_API_KEY && TRIPO_API_URL) {
    onStatus?.('Generating with Tripo...');
    return callTripoApi(canvas);
  }

  onStatus?.('No Tripo credentials set — using placeholder mesh (see .env.example)');
  await fakeDelay(900); // stand-in for real generation latency
  return buildPlaceholderBridge();
}

async function callTripoApi(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  // TODO(hackathon-day): replace with the real Tripo request once you have
  // API docs + keys from check-in. This is unverified placeholder shape.
  const form = new FormData();
  form.append('image', blob, 'sketch.png');

  const res = await fetch(TRIPO_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TRIPO_API_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Tripo request failed: ${res.status}`);

  // TODO(hackathon-day): parse the real response and load the returned
  // model (likely a glTF/GLB URL) with THREE.GLTFLoader instead of this.
  const data = await res.json();
  console.warn('Tripo response received but not yet wired to a loader:', data);
  return buildPlaceholderBridge();
}

function fakeDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A simple procedural bridge: deck + two support posts, used as the MVP stand-in for a generated model. */
function buildPlaceholderBridge() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc79a5f, roughness: 0.8 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), material);
  deck.position.y = 0.5;
  group.add(deck);

  const postGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
  const postPositions = [-0.4, 0.4];
  for (const x of postPositions) {
    const post = new THREE.Mesh(postGeometry, material);
    post.position.set(x, 0.25, 0);
    group.add(post);
  }

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return group;
}
