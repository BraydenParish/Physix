import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { createServerLoop } from './bootstrap.js';

async function runServer() {
  const RAPIER = await import('@dimforge/rapier3d-compat');
  await RAPIER.init();

  const loop = createServerLoop({ rapier: RAPIER, now: () => performance.now() / 1000 });
  loop.start();

  process.on('SIGINT', () => {
    loop.stop();
    process.exit(0);
  });

  return loop;
}

const isEntryPoint = typeof process.argv[1] === 'string' && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isEntryPoint) {
  void runServer();
}

export { runServer };
