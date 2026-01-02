import type * as RAPIERTypes from '@dimforge/rapier3d-compat';
import { glitchSpec } from '@fysix/common';
import { performance } from 'node:perf_hooks';
import { Kernel } from './kernel.js';
import { spawnPlayer } from './physics.js';

export interface ServerLoopOptions {
  rapier: typeof RAPIERTypes;
  now?: () => number;
  intervalMs?: number;
  kernel?: Kernel;
  simulateStep?: () => void;
  gravity?: { x: number; y: number; z: number };
  playerStart?: { x: number; y: number; z: number };
  maxDt?: number;
  schedule?: (cb: () => void, intervalMs: number) => NodeJS.Timeout | number;
  cancel?: (handle: NodeJS.Timeout | number) => void;
  log?: (msg: string) => void;
}

export interface ServerLoopHandle {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  getWorld: () => RAPIERTypes.World;
  getPlayerBody: () => RAPIERTypes.RigidBody;
  runOnce: (dtSeconds: number) => void;
  stats: () => { simSteps: number; netTicks: number; lastDt: number };
}

export function clampDt(dtSeconds: number, maxDtSeconds: number) {
  if (!Number.isFinite(dtSeconds)) return 0;
  return Math.max(0, Math.min(dtSeconds, maxDtSeconds));
}

export function createServerLoop(options: ServerLoopOptions): ServerLoopHandle {
  const kernel = options.kernel ?? new Kernel();
  const world = new options.rapier.World(options.gravity ?? { x: 0, y: 0, z: 0 });
  const player = spawnPlayer({ world, rapier: options.rapier }, options.playerStart ?? { x: 0, y: 1, z: 0 });
  const simulateStep = options.simulateStep ?? (() => world.step());
  const now = options.now ?? (() => performance.now() / 1000);
  const intervalMs = options.intervalMs ?? Math.round(glitchSpec.simDt * 1000);
  const maxDt = options.maxDt ?? glitchSpec.netDt;
  const schedule = options.schedule ?? ((cb: () => void, interval: number) => setInterval(cb, interval));
  const cancel = options.cancel ?? ((handle: NodeJS.Timeout | number) => clearInterval(handle as NodeJS.Timeout));
  const log = options.log;

  let running = false;
  let lastNowSeconds = now();
  let timer: NodeJS.Timeout | number | null = null;
  const stats = { simSteps: 0, netTicks: 0, lastDt: 0 };

  const applyStep = (dt: number) => {
    const result = kernel.step(dt, {
      simulateStep: () => {
        simulateStep();
      },
      netTick: () => {
        stats.netTicks += 1;
      }
    });

    stats.simSteps += result.simSteps;
    stats.lastDt = dt;
  };

  const tick = () => {
    const current = now();
    const dt = clampDt(current - lastNowSeconds, maxDt);
    lastNowSeconds = current;
    applyStep(dt);
  };

  return {
    start: () => {
      if (running) return;
      running = true;
      lastNowSeconds = now();
      timer = schedule(tick, intervalMs);
      log?.('server loop started');
    },
    stop: () => {
      if (!running) return;
      running = false;
      if (timer !== null) {
        cancel(timer);
        timer = null;
      }
      log?.('server loop stopped');
    },
    isRunning: () => running,
    getWorld: () => world,
    getPlayerBody: () => player,
    runOnce: (dtSeconds: number) => {
      const dt = clampDt(dtSeconds, maxDt);
      applyStep(dt);
    },
    stats: () => ({ ...stats })
  };
}
