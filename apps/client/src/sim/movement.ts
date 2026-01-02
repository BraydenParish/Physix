import { InputState } from './input.js';
import { PlayerState } from './state.js';

export interface MovementParams {
  walkSpeed: number;
  sprintMultiplier: number;
  maxDt: number;
  lookSensitivity: number;
}

export const defaultMovementParams: MovementParams = {
  walkSpeed: 4.5,
  sprintMultiplier: 1.6,
  maxDt: 0.05,
  lookSensitivity: 0.0025
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const updatePlayer = (
  state: PlayerState,
  input: InputState,
  dtSeconds: number,
  params: MovementParams = defaultMovementParams
): PlayerState => {
  const clampedDt = Math.min(dtSeconds, params.maxDt);

  const yaw = state.yaw - input.lookDeltaX * params.lookSensitivity;
  const pitch = clamp(state.pitch - input.lookDeltaY * params.lookSensitivity, -Math.PI / 2, Math.PI / 2);

  const forwardX = Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = Math.sin(yaw);

  let moveX = 0;
  let moveZ = 0;

  if (input.forward) {
    moveX += forwardX;
    moveZ += forwardZ;
  }
  if (input.backward) {
    moveX -= forwardX;
    moveZ -= forwardZ;
  }
  if (input.right) {
    moveX += rightX;
    moveZ += rightZ;
  }
  if (input.left) {
    moveX -= rightX;
    moveZ -= rightZ;
  }

  const magnitude = Math.hypot(moveX, moveZ);
  if (magnitude > 0) {
    moveX /= magnitude;
    moveZ /= magnitude;
  }

  const speed = params.walkSpeed * (input.sprint ? params.sprintMultiplier : 1);
  const deltaX = moveX * speed * clampedDt;
  const deltaZ = moveZ * speed * clampedDt;

  return {
    position: {
      x: state.position.x + deltaX,
      y: state.position.y,
      z: state.position.z + deltaZ
    },
    yaw,
    pitch
  };
};
