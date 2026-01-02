import { beforeAll, describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { computeVisibility } from '../src/visibility.js';
import { losRayGroup, spawnPlayer, spawnWallBox } from '../src/physics.js';

let RAPIER: typeof RAPIERTypes;

beforeAll(async () => {
  RAPIER = await import('@dimforge/rapier3d-compat');
  await RAPIER.init();
});

describe('Firewall LOS visibility', () => {
  test('players see each other with clear LOS', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(true);
  });

  test('visibility query does not clobber integration dt', () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }), (dt) => {
        const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
        world.integrationParameters.dt = dt;

        computeVisibility(
          world,
          { position: { x: 0, y: 0, z: 0 } as RAPIERTypes.Vector3 },
          [{ id: 't', position: { x: 1, y: 0, z: 0 } as RAPIERTypes.Vector3 }]
        );

        expect(world.integrationParameters.dt).toBeCloseTo(dt, 10);
      }),
      { numRuns: 15 }
    );
  });

  test('restores integration dt even if stepping fails', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const originalDt = world.integrationParameters.dt;
    const stepSpy = vi.spyOn(world, 'step').mockImplementation(() => {
      throw new Error('visibility step failure');
    });

    try {
      expect(() =>
        computeVisibility(
          world,
          { position: { x: 0, y: 0, z: 0 } as RAPIERTypes.Vector3 },
          [{ id: 't', position: { x: 1, y: 0, z: 0 } as RAPIERTypes.Vector3 }]
        )
      ).toThrow('visibility step failure');

      expect(world.integrationParameters.dt).toBeCloseTo(originalDt, 10);
    } finally {
      stepSpy.mockRestore();
    }
  });

  test('applies LOS ray collision groups in the filter slot', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const castRaySpy = vi.spyOn(world, 'castRay');
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });

    try {
      computeVisibility(world, { position: observer.translation() }, [
        { id: 'target', position: target.translation() }
      ]);

      const [,, , filterFlags, filterGroups, , , filterPredicate] = castRaySpy.mock.calls[0] ?? [];
      expect(filterFlags).toBeUndefined();
      expect(filterGroups).toBe(losRayGroup());
      expect(filterPredicate).toBeUndefined();
    } finally {
      castRaySpy.mockRestore();
    }
  });

  test('a wall blocks LOS', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });
    spawnWallBox(ctx, { x: 5, y: 1, z: 0 }, { x: 1, y: 2, z: 5 });

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(false);
  });

  test('other players do not block LOS', () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });
    spawnPlayer(ctx, { x: 5, y: 1, z: 0 });

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(true);
  });
});
