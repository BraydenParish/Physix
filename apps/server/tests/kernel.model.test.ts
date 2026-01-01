import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Kernel } from '../src/kernel.js';
import { glitchSpec } from '@fysix/common';

describe('Kernel torture model', () => {
  test('no backlog burst even after freezes', () => {
    const dtChoices = [
      0,
      glitchSpec.simDt,
      glitchSpec.netDt / 2,
      glitchSpec.netDt,
      0.2 // freeze event
    ];

    fc.assert(
      fc.property(fc.array(fc.constantFrom(...dtChoices), { minLength: 1, maxLength: 50 }), (dts) => {
        const kernel = new Kernel();
        let totalNetTicks = 0;

        for (const dt of dts) {
          let stepNetTicks = 0;
          kernel.step(dt, {
            simulateStep: () => {},
            netTick: () => {
              stepNetTicks += 1;
              totalNetTicks += 1;
            }
          });

          // Overwrite-latest style backlog drop: never emit more than one net tick per step
          expect(stepNetTicks).toBeLessThanOrEqual(1);
          expect(kernel.netAccumulator).toBeLessThan(glitchSpec.netDt + 1e-9);
        }

        // Total net ticks should never exceed the number of steps
        expect(totalNetTicks).toBeLessThanOrEqual(dts.length);
      })
    );
  });
});
