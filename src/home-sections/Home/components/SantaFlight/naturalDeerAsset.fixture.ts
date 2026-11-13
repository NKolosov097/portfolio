import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { DataTexture, RGBAFormat } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/** Parse the shipped geometry and rig, replacing only browser image decoding in Node checks. */
export async function loadNaturalDeerGLTFFixture() {
  const bytes = await readFile(path.resolve('public/assets/models/winter/natural-deer-v2.glb'))
  const loader = new GLTFLoader()
  loader.register(() => ({
    name: 'EXT_texture_webp',
    /** Retain the texture ownership contract without requiring a browser image decoder. */
    loadTexture: async () => new DataTexture(new Uint8Array([146, 111, 78, 255]), 1, 1, RGBAFormat),
  }))
  return loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
}

/** Expose the actual ready scene for the synchronous model ownership tests. */
export async function loadNaturalDeerFixture() {
  return (await loadNaturalDeerGLTFFixture()).scene
}
