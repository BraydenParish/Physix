import type RAPIER from '@dimforge/rapier3d-compat';
import { glitchSpec, packGroups } from '@fysix/common';

export interface SpawnContext {
  world: RAPIER.World;
  rapier: typeof RAPIER;
}

const { walls, players, losRay } = glitchSpec.collisionGroups;

export function wallGroup(): number {
  return packGroups(walls.membership, walls.filter);
}

export function playerGroup(): number {
  return packGroups(players.membership, players.filter);
}

export function losRayGroup(): number {
  return packGroups(losRay.membership, losRay.filter);
}

export function spawnWallBox(ctx: SpawnContext, position: { x: number; y: number; z: number }, halfExtents: { x: number; y: number; z: number }) {
  const bodyDesc = ctx.rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
  const body = ctx.world.createRigidBody(bodyDesc);
  const colliderDesc = ctx.rapier.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
  colliderDesc.setCollisionGroups(wallGroup());
  return ctx.world.createCollider(colliderDesc, body);
}

export function spawnPlayer(ctx: SpawnContext, position: { x: number; y: number; z: number }) {
  const bodyDesc = ctx.rapier.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
  const body = ctx.world.createRigidBody(bodyDesc);
  const colliderDesc = ctx.rapier.ColliderDesc.ball(0.5);
  colliderDesc.setCollisionGroups(playerGroup());
  ctx.world.createCollider(colliderDesc, body);
  return body;
}
