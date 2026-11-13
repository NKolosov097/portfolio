import { Bone, Group, MeshStandardMaterial, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export const NATURAL_DEER_URL = '/assets/models/winter/natural-deer-v2.glb'
let ready: Group | null = null
let pending: Promise<void> | null = null

/** Share one CPU template while leaving all renderer-owned GPU resources to each team. */
export function prepareNaturalDeer(): Promise<void> {
  if (ready) return Promise.resolve()
  if (pending) return pending
  pending = new GLTFLoader()
    .loadAsync(NATURAL_DEER_URL)
    .then(({ scene }) => {
      const surfaces: SkinnedMesh[] = []
      scene.traverse((object) => {
        if (object instanceof SkinnedMesh) surfaces.push(object)
      })
      const surface = surfaces[0]
      if (
        surfaces.length !== 1 ||
        !(surface.material instanceof MeshStandardMaterial) ||
        !surface.material.map ||
        !surface.geometry.index ||
        !surface.geometry.getAttribute('skinIndex') ||
        !surface.geometry.getAttribute('skinWeight') ||
        surface.skeleton.bones.length !== 11
      )
        throw new Error('Natural deer requires one textured, eleven-bone skinned surface')
      for (const name of ['deer-neck', 'deer-head']) {
        if (!(scene.getObjectByName(name) instanceof Bone))
          throw new Error('Natural deer head rig is incomplete')
      }
      for (let limb = 1; limb <= 4; limb += 1) {
        for (const part of ['upper', 'lower']) {
          if (!(scene.getObjectByName(`deer-leg-${limb}-${part}`) instanceof Bone))
            throw new Error('Natural deer limb rig is incomplete')
        }
      }
      for (const side of ['left', 'right']) {
        for (let light = 1; light <= 4; light += 1) {
          if (!scene.getObjectByName(`deer-antler-light-${side}-${light}`))
            throw new Error('Natural deer antler attachments are incomplete')
        }
      }
      ready = scene
    })
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** Require preparation before the synchronous renderer factory can allocate a GPU context. */
export function getNaturalDeer(): Group {
  if (!ready) throw new Error('Natural deer assets have not finished loading')
  return ready
}
