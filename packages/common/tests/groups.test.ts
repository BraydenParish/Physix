import { describe, expect, test } from 'vitest';
import { glitchSpec } from '../spec/glitch_spec.js';
import { packGroups } from '../src/groups.js';

describe('packGroups', () => {
  test('packs membership into the high 16 bits and filter into low 16 bits', () => {
    const value = packGroups(0x1234, 0xabcd);
    expect(value >>> 0).toBe(0x1234abcd);
  });

  test('returns an unsigned 32-bit number even when all bits are set', () => {
    const value = packGroups(0xffff, 0xffff);
    expect(value >>> 0).toBe(0xffffffff);
  });

  test('glitch spec collision groups are packed consistently', () => {
    const wall = packGroups(glitchSpec.collisionGroups.walls.membership, glitchSpec.collisionGroups.walls.filter);
    const ray = packGroups(glitchSpec.collisionGroups.losRay.membership, glitchSpec.collisionGroups.losRay.filter);
    expect(wall).not.toBe(ray);
    expect(wall >>> 0).toBeGreaterThan(0);
  });
});
