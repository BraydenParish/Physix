export interface SnapshotSchema {
  version: number;
  fields: string[];
}

export interface TransportPolicy {
  mode: 'overwrite-latest';
  maxBufferedBytes: number;
  pendingLimit: number;
}

export interface CollisionGroupSpecEntry {
  membership: number;
  filter: number;
}

export interface CollisionGroupSpec {
  walls: CollisionGroupSpecEntry;
  players: CollisionGroupSpecEntry;
  losRay: CollisionGroupSpecEntry;
}

export interface GlitchSpec {
  simDt: number;
  netDt: number;
  collisionGroups: CollisionGroupSpec;
  snapshot: SnapshotSchema;
  transport: TransportPolicy;
}

export const glitchSpec: GlitchSpec = {
  simDt: 1 / 60,
  netDt: 1 / 20,
  collisionGroups: {
    walls: { membership: 1, filter: 1 | 2 | 4 },
    players: { membership: 2, filter: 1 | 2 },
    losRay: { membership: 4, filter: 1 }
  },
  snapshot: {
    version: 1,
    fields: ['tick', 'entities', 'timestamp']
  },
  transport: {
    mode: 'overwrite-latest',
    maxBufferedBytes: 64 * 1024,
    pendingLimit: 1
  }
};

export const SIM_DT = glitchSpec.simDt;
export const NET_DT = glitchSpec.netDt;
