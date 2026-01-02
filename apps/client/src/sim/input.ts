export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export const createInputState = (): InputState => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  lookDeltaX: 0,
  lookDeltaY: 0
});

export const clearLookDelta = (input: InputState): void => {
  input.lookDeltaX = 0;
  input.lookDeltaY = 0;
};
