export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  position: Vec3;
  yaw: number;
  pitch: number;
}

export const defaultPlayerState: PlayerState = {
  position: { x: 0, y: 1.6, z: 0 },
  yaw: 0,
  pitch: 0
};
