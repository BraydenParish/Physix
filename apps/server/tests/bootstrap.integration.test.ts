import { describe, expect, test, vi } from 'vitest';
import { glitchSpec } from '@fysix/common';
import fc from 'fast-check';
import { createServerLoop, clampDt } from '../src/bootstrap.js';
import { Kernel } from '../src/kernel.js';

const importRapier = async () => {
  const RAPIER = await import('@dimforge/rapier3d-compat');
  await RAPIER.init();
  return RAPIER;
};

describe('server bootstrap loop', () => {
  test('advances player body over time', async () => {
    const RAPIER = await importRapier();

    const loop = createServerLoop({ rapier: RAPIER });

    const player = loop.getPlayerBody();
    player.setLinvel({ x: 0, y: 0, z: 1 }, true);

    for (let i = 0; i < 60; i += 1) {
      loop.runOnce(glitchSpec.simDt);
    }

    expect(player.translation().z).toBeGreaterThan(0.5);
    expect(loop.stats().simSteps).toBeGreaterThan(10);
  });

  test('clamps dt to maxDt even after long gaps', async () => {
    const RAPIER = await importRapier();
    const kernel = new Kernel();
    const maxDt = glitchSpec.netDt;
    const stepSpy = vi.spyOn(kernel, 'step');
    const loop = createServerLoop({ rapier: RAPIER, kernel, intervalMs: 1, maxDt, simulateStep: () => {} });

    stepSpy.mockClear();
    loop.runOnce(5);
    loop.runOnce(2.5);

    const seenDts = stepSpy.mock.calls.map((call) => call[0] as number);
    expect(seenDts.every((dt) => dt <= maxDt + 1e-9 && dt >= 0)).toBe(true);
  });
});

describe('clampDt', () => {
  test('never exceeds max or drops below zero', () => {
    fc.assert(
      fc.property(fc.double({ min: -1000, max: 1000 }), fc.double({ min: 0.001, max: 1 }), (dt, maxDt) => {
        const result = clampDt(dt, maxDt);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(maxDt);
      })
    );
  });
});
