import { glitchSpec } from '@fysix/common';

export interface KernelHooks {
  simulateStep: () => void;
  netTick: () => void;
}

export class Kernel {
  simAccumulator = 0;
  netAccumulator = 0;
  maxSimSteps = 5;

  step(dtSeconds: number, hooks: KernelHooks) {
    this.simAccumulator += dtSeconds;
    this.netAccumulator += dtSeconds;

    let simSteps = 0;
    while (this.simAccumulator >= glitchSpec.simDt && simSteps < this.maxSimSteps) {
      hooks.simulateStep();
      this.simAccumulator -= glitchSpec.simDt;
      simSteps += 1;
    }

    if (simSteps === this.maxSimSteps && this.simAccumulator > 0) {
      // Drop any excessive backlog to prevent spiral of death
      this.simAccumulator = 0;
    }

    let netTicks = 0;
    if (this.netAccumulator >= glitchSpec.netDt) {
      hooks.netTick();
      netTicks += 1;
      // Drop backlog so only one snapshot is emitted even after long pauses
      this.netAccumulator = 0;
    }

    return { simSteps, netTicks };
  }
}
