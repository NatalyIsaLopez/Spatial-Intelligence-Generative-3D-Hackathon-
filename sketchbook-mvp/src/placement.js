import * as THREE from 'three';

/**
 * Normalizes an arbitrary generated object's bounding box to fit a target
 * socket size, positions it there, and returns an update(dt) function that
 * animates it rising into place. This is the "auto-fit" step that lets a
 * generic generated mesh sensibly span a specific gap without per-object
 * tuning.
 */
export function placeInSocket(object, socket) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scaleX = socket.size.x / (size.x || 1);
  const scaleY = socket.size.y / (size.y || 1);
  const scaleZ = socket.size.z / (size.z || 1);
  object.scale.set(scaleX, scaleY, scaleZ);

  // Re-measure after scaling, then align the object's base to the socket floor.
  const scaledBox = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  const offsetY = scaledBox.min.y;

  object.position.set(
    socket.position.x - (center.x - object.position.x),
    socket.position.y - offsetY,
    socket.position.z - (center.z - object.position.z)
  );

  const finalY = object.position.y;
  const riseDistance = 1.2;
  object.position.y = finalY - riseDistance;

  const startTime = performance.now();
  const durationMs = 700;

  return function update() {
    const t = Math.min(1, (performance.now() - startTime) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    object.position.y = finalY - riseDistance * (1 - eased);
    return t >= 1;
  };
}
