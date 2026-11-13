import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { DataTexture, RGBAFormat } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/** Parse the shipped mesh data while replacing only browser image decoding in Node. */
export async function loadNaturalSantaGLTFFixture() {
  const bytes = await readFile(path.resolve('public/assets/models/winter/natural-santa-v2.glb'))
  const loader = new GLTFLoader()
  loader.register(() => ({
    name: 'EXT_texture_webp',
    /** Preserve real texture references without a browser-only image decoder. */
    loadTexture: async () =>
      new DataTexture(new Uint8Array([180, 160, 145, 255]), 1, 1, RGBAFormat),
  }))
  return loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
}

/** Return the actual static CPU template used by model ownership checks. */
export async function loadNaturalSantaFixture() {
  return (await loadNaturalSantaGLTFFixture()).scene
}
