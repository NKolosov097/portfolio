/** Lifecycle of the in-page DOOM machine, driving which overlay/controls are rendered. */
export type DoomMachineStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'playing' }
  | { kind: 'error'; message: string }
