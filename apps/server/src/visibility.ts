import RAPIER from '@dimforge/rapier3d-compat';
import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { losRayGroup } from './physics.js';

export interface VisibilityResult {
  targetId: string;
  visible: boolean;
}

function computeVisibility(
  world: RAPIERTypes.World,
  observer: { position: RAPIERTypes.Vector3 },
  targets: Array<{ id: string; position: RAPIERTypes.Vector3 }>
): VisibilityResult[] {
  const direction = { x: 0, y: 0, z: 0 };
  const normalized = { x: 0, y: 0, z: 0 };

  return targets.map((target) => {
    direction.x = target.position.x - observer.position.x;
    direction.y = target.position.y - observer.position.y;
    direction.z = target.position.z - observer.position.z;

    const distance = Math.hypot(direction.x, direction.y, direction.z);
    if (distance === 0) {
      return { targetId: target.id, visible: true };
    }

    normalized.x = direction.x / distance;
    normalized.y = direction.y / distance;
    normalized.z = direction.z / distance;

    const ray = new RAPIER.Ray(observer.position, normalized);
    const hit = world.castRay(ray, distance, true, undefined, losRayGroup());
    const visible = hit === null;

    return { targetId: target.id, visible };
  });
}

// @internal Exported for orchestrator-only usage.
export { computeVisibility as _internalComputeVisibility };
