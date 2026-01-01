import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { createClientChannel, flushChannel, queueSnapshot, type SnapshotEnvelope } from '../src/network_system.js';
import { glitchSpec } from '@fysix/common';

class MockSocket {
  sent: string[] = [];
  bufferedAmount = 0;
  constructor(public threshold: number) {}
  setCongested(congested: boolean) {
    this.bufferedAmount = congested ? this.threshold + 1 : 0;
  }
  send(data: string) {
    this.sent.push(data);
  }
}

type Model = {
  congested: boolean;
  pending: SnapshotEnvelope | null;
  sent: SnapshotEnvelope[];
};

describe('transport overwrite-latest mailbox', () => {
  test('pending slot stays bounded and only the latest snapshot survives congestion', () => {
    const threshold = glitchSpec.transport.maxBufferedBytes;

    const emitSnapshot = (): fc.Command<Model, { socket: MockSocket; channel: ReturnType<typeof createClientChannel> }> => ({
      check: () => true,
      run: (model, real) => {
        const snapshot: SnapshotEnvelope = {
          tick: model.sent.length + (model.pending ? 1 : 0) + 1,
          payload: { rand: Math.random() }
        };

        if (model.congested) {
          model.pending = snapshot;
        } else {
          model.sent.push(snapshot);
          model.pending = null;
        }

        queueSnapshot(real.channel, snapshot, threshold);

        assertState(model, real);
      }
    });

    const toggleCongestion = (congested: boolean): fc.Command<Model, { socket: MockSocket; channel: ReturnType<typeof createClientChannel> }> => ({
      check: () => true,
      run: (model, real) => {
        model.congested = congested;
        real.socket.setCongested(congested);

        if (!congested && model.pending) {
          model.sent.push(model.pending);
          model.pending = null;
        }

        flushChannel(real.channel, threshold);
        assertState(model, real);
      }
    });

    const commandArb = fc.constantFrom(emitSnapshot(), toggleCongestion(true), toggleCongestion(false));

    fc.assert(
      fc.property(fc.array(commandArb, { minLength: 3, maxLength: 30 }), (commands) => {
        const socket = new MockSocket(threshold);
        const channel = createClientChannel(socket);
        const model: Model = { congested: false, pending: null, sent: [] };

        fc.modelRun(() => ({ model, real: { socket, channel } }), commands);
      })
    );
  });
});

function assertState(model: Model, real: { socket: MockSocket; channel: ReturnType<typeof createClientChannel> }) {
  const decoded = real.socket.sent.map((s) => JSON.parse(s) as SnapshotEnvelope);
  expect(decoded).toEqual(model.sent);

  if (model.pending) {
    expect(real.channel.pending?.tick).toBe(model.pending.tick);
  } else {
    expect(real.channel.pending).toBeNull();
  }

  const pendingCount = real.channel.pending ? 1 : 0;
  expect(pendingCount).toBeLessThanOrEqual(1);
  expect(real.channel.metrics.pendingOverwritten).toBeGreaterThanOrEqual(0);
  expect(real.channel.metrics.sendSuppressedDueToBackpressure).toBeGreaterThanOrEqual(0);
}
