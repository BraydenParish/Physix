import { glitchSpec } from '../spec/glitch_spec.js';

export function packGroups(membership: number, filter: number): number {
  return (((membership & 0xffff) << 16) | (filter & 0xffff)) >>> 0;
}

const collisionGroups = glitchSpec.collisionGroups;

export const WALL_GROUP = packGroups(collisionGroups.walls.membership, collisionGroups.walls.filter);
export const PLAYER_GROUP = packGroups(collisionGroups.players.membership, collisionGroups.players.filter);
export const LOS_RAY_GROUP = packGroups(collisionGroups.losRay.membership, collisionGroups.losRay.filter);

export type CollisionGroupName = keyof typeof collisionGroups;
