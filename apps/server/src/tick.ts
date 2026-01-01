import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { _internalComputeVisibility, type VisibilityResult } from './visibility.js';
import { Kernel } from './kernel.js';
import { queueSnapshot, type ClientChannel, type SnapshotEnvelope } from './network_system.js';

export interface VisibilityTickOptions {
  simStepsToRun: number;
  simulateStep: () => void;
  bodiesMutatedOutsideStep?: boolean;
  sceneChanged?: boolean;
  stepsAlreadySimulated?: number;
}

/**
 * Tick Contract: run 0..N physics steps (catch-up allowed), optionally propagate collider updates
 * when bodies were mutated outside stepping or the scene changed, then evaluate LOS exactly once.
 * Tests locking this order: visibility.test.ts (no hidden stepping, spawn/despawn) and
 * server_tick.integration.test.ts (net tick broadcast cadence).
 */
export function runVisibilityTick(
  world: RAPIERTypes.World,
  options: VisibilityTickOptions,
  observer: { position: RAPIERTypes.Vector3 },
  targets: Array<{ id: string; position: RAPIERTypes.Vector3 }>
): VisibilityResult[] {
  const simulateStep = options.simulateStep ?? (() => {});
  const stepsToRun = Math.max(0, options.simStepsToRun);
  let stepsExecuted = Math.max(0, options.stepsAlreadySimulated ?? 0);

  for (let i = 0; i < stepsToRun; i += 1) {
    simulateStep();
    stepsExecuted += 1;
  }

  const needsPropagation =
    options.bodiesMutatedOutsideStep === true || options.sceneChanged === true || stepsExecuted === 0;
  if (needsPropagation && typeof world.propagateModifiedBodyPositionsToColliders === 'function') {
    world.propagateModifiedBodyPositionsToColliders();
  }

  if (options.sceneChanged === true && stepsExecuted === 0 && typeof world.step === 'function') {
    const originalDt = (world as any).integrationParameters?.dt;
    if (typeof originalDt === 'number' && (world as any).integrationParameters) {
      (world as any).integrationParameters.dt = 0;
    }
    world.step();
    if (typeof originalDt === 'number' && (world as any).integrationParameters) {
      (world as any).integrationParameters.dt = originalDt;
    }
  }

  return _internalComputeVisibility(world, observer, targets);
}

export interface ServerFrameParams {
  kernel: Kernel;
  world: RAPIERTypes.World;
  dt: number;
  simulateStep: () => void;
  observer: { position: RAPIERTypes.Vector3 };
  targets: Array<{ id: string; position: RAPIERTypes.Vector3 }>;
  channel: ClientChannel;
  buildSnapshot: (visibility: VisibilityResult[]) => SnapshotEnvelope;
  bodiesMutatedOutsideStep?: boolean;
  sceneChanged?: boolean;
}

export function runServerFrame(params: ServerFrameParams) {
  let simStepsPerformed = 0;
  let netTicks = 0;

  params.kernel.step(params.dt, {
    simulateStep: () => {
      params.simulateStep();
      simStepsPerformed += 1;
    },
    netTick: () => {
      netTicks += 1;
    }
  });

  const visibility = runVisibilityTick(
    params.world,
    {
      simStepsToRun: 0,
      simulateStep: params.simulateStep,
      stepsAlreadySimulated: simStepsPerformed,
      bodiesMutatedOutsideStep: params.bodiesMutatedOutsideStep,
      sceneChanged: params.sceneChanged
    },
    params.observer,
    params.targets
  );

  if (netTicks > 0) {
    const snapshot = params.buildSnapshot(visibility);
    queueSnapshot(params.channel, snapshot);
  }

  return { simStepsPerformed, netTicks };
}
