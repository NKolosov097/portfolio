import type { Object3D } from 'three'

import type { SantaFormationFrame } from './santaModel'

/** Retain finite harmonic phases when a preview seeks far along the timeline. */
function wave(seconds: number, frequency: number, phase: number): number {
  return Math.sin((seconds % ((Math.PI * 2) / frequency)) * frequency + phase)
}

/** Share the flying sleigh's exact bob, attitude, and scale with its rear trail emitter. */
export function placeSantaSleigh(
  seconds: number,
  frame: SantaFormationFrame,
  scale: number,
  target: Object3D,
): void {
  target.position.set(
    0,
    -0.1 + 0.22 * wave(seconds, 2.4, -1.1) + 0.065 * wave(seconds, 4.3, 0.6),
    0,
  )
  target.rotation.set(
    0.022 * wave(seconds, 1.7, 0.3),
    0,
    0.055 * wave(seconds, 2.4, -0.65) + 0.02 * wave(seconds, 4.3, 1.05),
  )
  target.position.multiplyScalar(scale).applyQuaternion(frame.rotation).add(frame.position)
  target.quaternion.premultiply(frame.rotation)
  target.scale.setScalar(scale)
}
