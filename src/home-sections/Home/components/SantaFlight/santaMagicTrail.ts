import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Object3D,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'

import type { SantaFormation } from './santaModel'
import { placeSantaSleigh } from './santaSleighPose'
import { createSantaRoutes, sampleSantaFlight, sampleSantaTimedFormation } from './santaTrajectory'

const PARTICLES = 192
const BIRTHS_PER_SECOND = 128
const LIFETIME = 1.5

/** Reuse bounded birth anchors while reconstructing the same deterministic world-space stardust. */
export function createSantaMagicTrail(): {
  object: Points<BufferGeometry, ShaderMaterial>
  update: (
    seconds: number,
    routes: ReturnType<typeof createSantaRoutes>,
    spacing: number,
    scale: number,
    drawingHeight: number,
    pixelRatio: number,
  ) => void
  dispose: VoidFunction
} {
  const positions = new BufferAttribute(new Float32Array(PARTICLES * 3), 3).setUsage(
    DynamicDrawUsage,
  )
  const appearance = new BufferAttribute(new Float32Array(PARTICLES * 3), 3).setUsage(
    DynamicDrawUsage,
  )
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', positions)
  geometry.setAttribute('appearance', appearance)
  geometry.setDrawRange(0, 0)
  const material = new ShaderMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    uniforms: { drawingHeight: { value: 1 }, minimumDiameter: { value: 2 } },
    vertexShader: `
      attribute vec3 appearance;
      uniform float drawingHeight;
      uniform float minimumDiameter;
      varying float opacity;
      varying float glint;
      // Size particles in world space so depth and viewport changes match the sleigh.
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(appearance.x * drawingHeight * projectionMatrix[1][1] / (-2.0 * view.z), minimumDiameter, 64.0);
        opacity = appearance.y;
        glint = appearance.z;
      }
    `,
    fragmentShader: `
      varying float opacity;
      varying float glint;
      // Combine a soft golden halo and sparse four-point stars in one transparent draw.
      void main() {
        vec2 point = abs(gl_PointCoord * 2.0 - 1.0);
        float radius = length(point);
        float halo = pow(max(0.0, 1.0 - radius), 2.5);
        float core = pow(max(0.0, 1.0 - radius), 12.0);
        float star = pow(max(0.0, 1.0 - min(point.x, point.y) * 12.0), 2.0)
          * pow(max(0.0, 1.0 - max(point.x, point.y)), 1.5) * glint;
        float alpha = (halo * 0.7 + core + star * 0.8) * opacity;
        float highlight = clamp(core + star * opacity, 0.0, 1.0);
        vec3 pearl = mix(vec3(1.0, 0.93, 0.62), vec3(1.0, 0.98, 0.92), glint);
        gl_FragColor = vec4(mix(vec3(1.0, 0.72, 0.3), pearl, highlight), alpha);
      }
    `,
  })
  const object = new Points(geometry, material)
  object.name = 'santa-magic-trail'
  object.visible = false
  object.frustumCulled = false
  const formation: SantaFormation = {
    frames: [
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
      { position: new Vector3(), rotation: new Quaternion() },
    ],
    scale: 1,
  }
  const sleigh = new Object3D()
  const anchor = new Vector3()
  const birthAnchors = new Float64Array(PARTICLES * 3)
  const birthIds = new Float64Array(PARTICLES).fill(-1)
  let cachedRoute: ReturnType<typeof createSantaRoutes>['near'] | undefined
  let cachedSpacing = NaN
  let cachedScale = NaN
  let cachedPassStart = NaN
  let previousSeconds = NaN
  let disposed = false

  return {
    object,
    /** Sample only new births while preserving direct seeks and each particle's original drift. */
    update(seconds, routes, spacing, scale, drawingHeight, pixelRatio) {
      if (disposed) return
      const pose = sampleSantaFlight(seconds)
      object.visible = Number.isFinite(seconds) && seconds !== -1 && pose.visible
      if (!object.visible) {
        birthIds.fill(-1)
        cachedRoute = undefined
        geometry.setDrawRange(0, 0)
        return
      }
      const duration = pose.phase === 'near' ? 9 : 12
      const passTime = pose.progress * duration
      const newest = Math.floor(passTime * BIRTHS_PER_SECOND)
      const count = Math.min(PARTICLES, newest + 1)
      const route = routes[pose.phase === 'near' ? 'near' : 'distant']
      const componentScale = (spacing / 4) * scale
      const passStart = seconds - passTime
      if (
        route !== cachedRoute ||
        spacing !== cachedSpacing ||
        scale !== cachedScale ||
        Math.abs(passStart - cachedPassStart) > 1e-7 ||
        seconds < previousSeconds
      ) {
        birthIds.fill(-1)
      }
      cachedRoute = route
      cachedSpacing = spacing
      cachedScale = scale
      cachedPassStart = passStart
      previousSeconds = seconds
      for (let index = 0; index < count; index += 1) {
        const birth = newest - index
        const birthTime = birth / BIRTHS_PER_SECOND
        const age = passTime - birthTime
        const life = age / LIFETIME
        const seed = Math.sin(birth * 127.1 + 311.7) * 43_758.5453
        const random = seed - Math.floor(seed)
        const phase = random * Math.PI * 2
        const spin = age * (3 + random * 3)
        const slot = birth % PARTICLES
        const offset = slot * 3
        if (birthIds[slot] !== birth) {
          sampleSantaTimedFormation(route, birthTime / duration, spacing * scale, formation.frames)
          placeSantaSleigh(seconds - age, formation.frames[2], componentScale, sleigh)
          // Birth parity keeps each historical spark attached to its original rear runner tip.
          anchor
            .set(-1.98, -0.29, birth % 2 === 0 ? -0.68 : 0.68)
            .multiplyScalar(componentScale)
            .applyQuaternion(sleigh.quaternion)
          anchor.add(sleigh.position)
          birthAnchors[offset] = anchor.x
          birthAnchors[offset + 1] = anchor.y
          birthAnchors[offset + 2] = anchor.z
          birthIds[slot] = birth
        } else {
          anchor.fromArray(birthAnchors, offset)
        }
        // Birth positions stay on their historical arc; only restrained dust drift grows with age.
        anchor.x += Math.sin(birth * 2.4) * age * 0.25 * componentScale
        anchor.y += (Math.cos(birth * 1.7) * age * 0.9 - age * age * 0.18) * componentScale
        anchor.z += Math.sin(birth * 3.1) * age * 0.7 * componentScale
        // Small phase-shifted eddies start at zero while keeping the established broad spread.
        anchor.x += (Math.sin(phase + spin) - Math.sin(phase)) * age * 0.07 * componentScale
        anchor.y += (Math.cos(phase + spin) - Math.cos(phase)) * age * 0.11 * componentScale
        anchor.z += (Math.sin(phase + spin * 0.8) - Math.sin(phase)) * age * 0.1 * componentScale
        positions.setXYZ(index, anchor.x, anchor.y, anchor.z)
        const glint = birth % 29 === 0 ? 1 : 0
        const medium = birth % 5 === 0
        const twinkle = 0.75 + 0.25 * Math.sin(age * (4 + random * 5) + phase)
        const pulse = (0.5 + 0.5 * Math.sin(age * (6 + random * 4) + phase)) ** 8
        const brightness = glint
          ? 0.45 + pulse * 1.15
          : (medium ? 0.7 + random * 0.3 : 0.4 + random * 0.25) * twinkle
        const diameter = glint ? 0.95 : medium ? 0.5 + random * 0.15 : 0.24 + random * 0.16
        appearance.setXYZ(
          index,
          diameter * componentScale * (1 - life * 0.65),
          (1 - life) ** 1.5 * brightness,
          glint,
        )
      }
      positions.needsUpdate = true
      appearance.needsUpdate = true
      material.uniforms.drawingHeight.value = drawingHeight
      material.uniforms.minimumDiameter.value = 2 * pixelRatio
      geometry.setDrawRange(0, count)
    },
    /** Release the single owned geometry and shader once, including repeated teardown. */
    dispose() {
      if (disposed) return
      disposed = true
      object.visible = false
      geometry.dispose()
      material.dispose()
    },
  }
}
