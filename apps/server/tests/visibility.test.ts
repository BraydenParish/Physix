import { beforeAll, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { computeVisibility } from '../src/visibility.js';
import { spawnPlayer, spawnWallBox } from '../src/physics.js';

let RAPIER: typeof RAPIERTypes;

beforeAll(async () => {
  RAPIER = await import('@dimforge/rapier3d-compat');
  await RAPIER.init();
});

describe('Firewall LOS visibility', () => {
  test('players see each other with clear LOS', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });

    world.step();

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(true);
  });

  test('a wall blocks LOS', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });
    spawnWallBox(ctx, { x: 5, y: 1, z: 0 }, { x: 1, y: 2, z: 5 });

    world.step();

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(false);
  });

  test('other players do not block LOS', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ctx = { world, rapier: RAPIER };

    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 10, y: 1, z: 0 });
    spawnPlayer(ctx, { x: 5, y: 1, z: 0 });

    world.step();

    const result = computeVisibility(world, { position: observer.translation() }, [
      { id: 'target', position: target.translation() }
    ]);

    expect(result.find((r) => r.targetId === 'target')?.visible).toBe(true);
  });

  test('does not step the world inside visibility computation', () => {
    const mockWorld: any = {
      integrationParameters: { dt: 0 },
      step: () => {
        throw new Error('step should not be called');
      },
      castRay: () => null
    };

    const observer = { position: { x: 0, y: 0, z: 0 } } as any;
    const targets = [{ id: 't1', position: { x: 1, y: 0, z: 0 } }] as any;

    const result = computeVisibility(mockWorld, observer, targets);

    expect(result[0].visible).toBe(true);
  });

  test('visibility mirrors wall-hit presence (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }), (hitFlags) => {
        const calls: boolean[] = [];
        const mockWorld: any = {
          integrationParameters: { dt: 0 },
          step: () => {
            throw new Error('step should not be called in property');
          },
          castRay: () => {
            const flag = hitFlags[calls.length] ?? false;
            calls.push(flag);
            return flag ? { timeOfImpact: 0.5 } : null;
          }
        };

        const observer = { position: { x: 0, y: 0, z: 0 } } as any;
        const targets = hitFlags.map((_, idx) => ({ id: `t${idx}`, position: { x: 1 + idx, y: 0, z: 0 } })) as any;

        const results = computeVisibility(mockWorld, observer, targets);

        expect(results).toHaveLength(hitFlags.length);
        results.forEach((res, idx) => {
          expect(res.visible).toBe(!hitFlags[idx]);
        });
      })
    );
  });
});
