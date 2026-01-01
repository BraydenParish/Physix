import { describe, expect, test } from 'vitest';
import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { glitchSpec } from '@fysix/common';
import { Kernel } from '../src/kernel.js';
import { runServerFrame } from '../src/tick.js';
import { spawnPlayer } from '../src/physics.js';
import { createClientChannel, type BufferedSocket } from '../src/network_system.js';

let RAPIER: typeof RAPIERTypes;

describe('server tick integration', () => {
  test('only one snapshot broadcast per net tick even with sim catch-up', async () => {
    RAPIER = await import('@dimforge/rapier3d-compat');
    await RAPIER.init();

    const kernel = new Kernel();
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const ctx = { world, rapier: RAPIER };
    const observer = spawnPlayer(ctx, { x: 0, y: 1, z: 0 });
    const target = spawnPlayer(ctx, { x: 5, y: 1, z: 0 });

    const sent: unknown[] = [];
    const socket: BufferedSocket = {
      bufferedAmount: 0,
      send: (data: string) => sent.push(data)
    };
    const channel = createClientChannel(socket);

    let simStepsRun = 0;
    let broadcasts = 0;

    const dt = glitchSpec.netDt; // ensures multiple sim steps in one frame
    const result = runServerFrame({
      kernel,
      world,
      dt,
      simulateStep: () => {
        world.step();
        simStepsRun += 1;
      },
      observer: { position: observer.translation() },
      targets: [{ id: 't', position: target.translation() }],
      channel,
      buildSnapshot: (visibility) => ({ tick: broadcasts, payload: visibility })
    });
    broadcasts += result.netTicks;

    expect(simStepsRun).toBeGreaterThan(1);
    expect(broadcasts).toBe(1);
    expect(channel.pending).toBeNull();
    expect(channel.socket.bufferedAmount).toBe(0);
    expect(sent).toHaveLength(1);
  });
});
