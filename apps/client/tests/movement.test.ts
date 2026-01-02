import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { createInputState } from '../src/sim/input.js';
import { defaultMovementParams, updatePlayer } from '../src/sim/movement.js';
import { PlayerState } from '../src/sim/state.js';

describe('movement', () => {
  const baseState: PlayerState = {
    position: { x: 0, y: 1.6, z: 0 },
    yaw: 0,
    pitch: 0
  };

  test('press W for 1s moves forward by speed', () => {
    const input = createInputState();
    input.forward = true;
    const updated = updatePlayer(baseState, input, defaultMovementParams.maxDt, defaultMovementParams);
    expect(updated.position.z).toBeLessThan(baseState.position.z);
    expect(Math.abs(updated.position.z)).toBeCloseTo(
      defaultMovementParams.walkSpeed * defaultMovementParams.maxDt,
      5
    );
  });

  test('W + Shift moves farther than W alone', () => {
    const input = createInputState();
    input.forward = true;
    const walk = updatePlayer(baseState, input, defaultMovementParams.maxDt, defaultMovementParams);
    input.sprint = true;
    const sprint = updatePlayer(baseState, input, defaultMovementParams.maxDt, defaultMovementParams);
    expect(Math.abs(sprint.position.z)).toBeGreaterThan(Math.abs(walk.position.z));
  });

  test('A strafes left relative to yaw', () => {
    const input = createInputState();
    input.left = true;
    const yawedState = { ...baseState, yaw: Math.PI / 2 };
    const updated = updatePlayer(yawedState, input, 1, defaultMovementParams);
    expect(updated.position.x).toBeCloseTo(yawedState.position.x, 5);
    expect(updated.position.z).toBeLessThan(yawedState.position.z);
  });

  test('dt clamp prevents huge jumps (property)', () => {
    const input = createInputState();
    input.forward = true;

    fc.assert(
      fc.property(fc.double({ min: defaultMovementParams.maxDt, max: 10, noNaN: true, noInfinity: true }), dt => {
        const updated = updatePlayer(baseState, input, dt, defaultMovementParams);
        const distance = Math.hypot(
          updated.position.x - baseState.position.x,
          updated.position.z - baseState.position.z
        );
        return distance <= defaultMovementParams.walkSpeed * defaultMovementParams.maxDt + 1e-6;
      })
    );
  });
});
