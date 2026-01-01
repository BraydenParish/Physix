import { glitchSpec } from '@fysix/common';

export interface SnapshotEnvelope<T = unknown> {
  tick: number;
  payload: T;
}

export interface BufferedSocket {
  bufferedAmount: number;
  readyState?: number;
  send: (data: string) => void;
}

export interface ClientChannel {
  socket: BufferedSocket;
  pending: SnapshotEnvelope | null;
  metrics: {
    pendingOverwritten: number;
    sendSuppressedDueToBackpressure: number;
  };
}

export function createClientChannel(socket: BufferedSocket): ClientChannel {
  return {
    socket,
    pending: null,
    metrics: {
      pendingOverwritten: 0,
      sendSuppressedDueToBackpressure: 0
    }
  };
}

function canSend(channel: ClientChannel, maxBufferedBytes: number) {
  return channel.socket.bufferedAmount <= maxBufferedBytes;
}

export function flushChannel(channel: ClientChannel, maxBufferedBytes: number = glitchSpec.transport.maxBufferedBytes) {
  if (!channel.pending) {
    return { sent: false, suppressed: false };
  }

  if (!canSend(channel, maxBufferedBytes)) {
    channel.metrics.sendSuppressedDueToBackpressure += 1;
    return { sent: false, suppressed: true };
  }

  channel.socket.send(JSON.stringify(channel.pending));
  channel.pending = null;
  return { sent: true, suppressed: false };
}

export function queueSnapshot(channel: ClientChannel, snapshot: SnapshotEnvelope, maxBufferedBytes: number = glitchSpec.transport.maxBufferedBytes) {
  if (channel.pending) {
    channel.metrics.pendingOverwritten += 1;
  }
  channel.pending = snapshot;

  return flushChannel(channel, maxBufferedBytes);
}
