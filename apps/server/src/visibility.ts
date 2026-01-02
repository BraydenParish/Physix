import RAPIER from '@dimforge/rapier3d-compat';
import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { losRayGroup } from './physics.js';

export interface VisibilityResult {
  targetId: string;
  visible: boolean;
}

export function computeVisibility(
  world: RAPIERTypes.World,
  observer: { position: RAPIERTypes.Vector3 },
  targets: Array<{ id: string; position: RAPIERTypes.Vector3 }>
): VisibilityResult[] {
  // Keep the query pipeline in sync without advancing time.
  const integrationParameters = world.integrationParameters;
  const originalDt = integrationParameters.dt;
  integrationParameters.dt = 0;

  try {
    world.step();
  } finally {
    integrationParameters.dt = originalDt;
  }

  return targets.map((target) => {
    const direction = {
      x: target.position.x - observer.position.x,
      y: target.position.y - observer.position.y,
      z: target.position.z - observer.position.z
    };
    const distance = Math.hypot(direction.x, direction.y, direction.z);
    if (distance === 0) {
      return { targetId: target.id, visible: true };
    }

    const normalized = {
      x: direction.x / distance,
      y: direction.y / distance,
      z: direction.z / distance
    };

    const ray = new RAPIER.Ray(observer.position, normalized);
    const hit = world.castRay(ray, distance, true, undefined, losRayGroup());
    const visible = hit === null || hit.timeOfImpact > distance;

    return { targetId: target.id, visible };
  });
}

// Internal hook for tests that need to stub or spy on visibility evaluation.
export const _internalComputeVisibility = computeVisibility;
