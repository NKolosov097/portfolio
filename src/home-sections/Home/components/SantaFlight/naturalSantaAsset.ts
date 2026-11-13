import { Group, Mesh, MeshStandardMaterial, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export const NATURAL_SANTA_URL = '/assets/models/winter/natural-santa-v2.glb'
let ready: Group | null = null
let pending: Promise<void> | null = null

/** Cache decoded CPU surfaces while each renderer owns its uploaded resources. */
export function prepareNaturalSanta(): Promise<void> {
  if (ready) return Promise.resolve()
  if (pending) return pending
  pending = new GLTFLoader()
    .loadAsync(NATURAL_SANTA_URL)
    .then(({ scene, animations }) => {
      const surfaces: Mesh[] = []
      scene.traverse((object) => {
        if (object instanceof Mesh) surfaces.push(object)
      })
      if (animations.length || surfaces.length !== 3)
        throw new Error('Natural Santa requires three static surfaces and a textured head')
      for (const name of ['santa-natural-head', 'santa-hat-cloth', 'santa-hat-fur']) {
        const surface = surfaces.find((mesh) => mesh.name === name)
        if (
          !surface ||
          surface instanceof SkinnedMesh ||
          !(surface.material instanceof MeshStandardMaterial) ||
          (name === 'santa-natural-head' && !surface.material.map) ||
          !surface.geometry.index
        )
          throw new Error('Natural Santa requires three static surfaces and a textured head')
        const geometry = surface.geometry
        const index = geometry.index
        const position = geometry.getAttribute('position')
        const normal = geometry.getAttribute('normal')
        const uv = geometry.getAttribute('uv')
        if (
          !index ||
          !position ||
          !normal ||
          !uv ||
          position.itemSize !== 3 ||
          normal.itemSize !== 3 ||
          uv.itemSize !== 2 ||
          normal.count !== position.count ||
          uv.count !== position.count ||
          ![position, normal, uv].every((attribute) =>
            Array.from(attribute.array).every(Number.isFinite),
          ) ||
          !Array.from(index.array).every(
            (vertex) => Number.isInteger(vertex) && vertex >= 0 && vertex < position.count,
          ) ||
          index.count % 3 !== 0 ||
          geometry.getAttribute('skinIndex') ||
          geometry.getAttribute('skinWeight')
        )
          throw new Error('Natural Santa geometry is incomplete')
      }
      ready = scene
    })
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** Require both CPU assets before the renderer allocates its GPU context. */
export function getNaturalSanta(): Group {
  if (!ready) throw new Error('Natural Santa assets have not finished loading')
  return ready
}
