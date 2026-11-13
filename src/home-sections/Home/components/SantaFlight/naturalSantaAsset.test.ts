import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { AnimationClip, Box3, Group, Mesh, MeshStandardMaterial, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadNaturalSantaGLTFFixture } from './naturalSantaAsset.fixture'

afterEach(() => vi.restoreAllMocks())

describe('natural Santa CPU template', () => {
  it('deduplicates preparation and retries a failed request without replacing the ready template', async () => {
    const gltf = await loadNaturalSantaGLTFFixture()
    vi.resetModules()
    const load = vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockRejectedValueOnce(new Error('Temporary cap failure'))
    const asset = await import('./naturalSantaAsset')
    expect(() => asset.getNaturalSanta()).toThrow('not finished loading')
    const failed = asset.prepareNaturalSanta()
    expect(asset.prepareNaturalSanta()).toBe(failed)
    await expect(failed).rejects.toThrow('Temporary cap failure')
    load.mockResolvedValueOnce(gltf)
    const pending = asset.prepareNaturalSanta()
    expect(asset.prepareNaturalSanta()).toBe(pending)
    await pending
    expect(asset.getNaturalSanta()).toBe(gltf.scene)
    await asset.prepareNaturalSanta()
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('/assets/models/winter/natural-santa-v2.glb')
  })

  it.each(['missing', 'nonfinite', 'unindexed', 'animated'] as const)(
    'rejects a %s template before rendering',
    async (defect) => {
      const gltf = await loadNaturalSantaGLTFFixture()
      const head = gltf.scene.getObjectByName('santa-natural-head')
      if (!(head instanceof Mesh)) throw new Error('Expected shipped head mesh')
      if (defect === 'missing') gltf.scene = new Group()
      if (defect === 'nonfinite') head.geometry.getAttribute('position').setX(0, NaN)
      if (defect === 'unindexed') head.geometry.setIndex(null)
      if (defect === 'animated') gltf.animations.push(new AnimationClip('unexpected', 1, []))
      vi.resetModules()
      vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValueOnce(gltf)
      const asset = await import('./naturalSantaAsset')
      await expect(asset.prepareNaturalSanta()).rejects.toThrow(/Natural Santa/)
      expect(() => asset.getNaturalSanta()).toThrow('not finished loading')
    },
  )

  it('ships compact static head/cap geometry with finite UVs, fitted bounds and complete maps', async () => {
    const gltf = await loadNaturalSantaGLTFFixture()
    expect(gltf.animations).toEqual([])
    let triangles = 0
    const capBounds = new Box3()
    for (const name of ['santa-natural-head', 'santa-hat-cloth', 'santa-hat-fur']) {
      const mesh = gltf.scene.getObjectByName(name)
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshStandardMaterial))
        throw new Error('Expected static textured mesh')
      expect(mesh).not.toBeInstanceOf(SkinnedMesh)
      const { geometry, material } = mesh
      const position = geometry.getAttribute('position'),
        uv = geometry.getAttribute('uv'),
        index = geometry.index
      if (!index) throw new Error('Expected indexed compact geometry')
      expect(Array.from(position.array).every(Number.isFinite)).toBe(true)
      expect(Array.from(uv.array).every(Number.isFinite)).toBe(true)
      expect(uv.count).toBe(position.count)
      expect(new Set(index.array).size).toBe(position.count)
      expect(Math.max(...index.array)).toBeLessThan(position.count)
      expect(geometry.getAttribute('skinIndex')).toBeUndefined()
      expect(material.metalness).toBe(0)
      expect(material.roughness).toBeGreaterThanOrEqual(0.9)
      triangles += index.count / 3
      const bounds = new Box3().setFromObject(mesh),
        size = bounds.getSize(new Vector3())
      if (name === 'santa-natural-head') {
        expect(index.count / 3).toBe(19_999)
        expect(material.map).toBeTruthy()
        expect(bounds.min.y).toBeGreaterThan(0.74)
        expect(bounds.max.y).toBeLessThan(1.51)
        expect(size.z).toBeLessThan(0.48)
      } else {
        expect(index.count / 3).toBe(name === 'santa-hat-cloth' ? 2336 : 2192)
        expect(material.map).toBeNull()
        expect(material.normalMap).toBeNull()
        expect(material.roughnessMap).toBeNull()
        expect(material.roughness).toBe(1)
        capBounds.expandByObject(mesh)
      }
    }
    expect(triangles).toBe(24_527)
    expect(capBounds.min.y).toBeCloseTo(1.47, 6)
    expect(capBounds.max.y).toBeGreaterThan(1.9)
    expect(capBounds.max.y).toBeLessThan(1.91)
    expect(capBounds.getSize(new Vector3()).z).toBeLessThan(0.41)
  })

  it('decodes the actual embedded maps at their budgeted dimensions and pins the prepared bytes', async () => {
    const bytes = await readFile(path.resolve('public/assets/models/winter/natural-santa-v2.glb'))
    expect(bytes.length).toBeLessThan(2_000_000)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1',
    )
    const json: {
      images: { bufferView: number }[]
      bufferViews: { byteOffset: number; byteLength: number }[]
      buffers: { byteLength: number }[]
    } = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
    const start = 28 + bytes.readUInt32LE(12)
    expect(start + json.buffers[0].byteLength).toBe(bytes.length)
    const sharp: (input: Buffer) => {
      metadata: () => Promise<{ width?: number; height?: number }>
    } = createRequire(import.meta.url)(
      createRequire(import.meta.url).resolve('sharp', {
        paths: [path.dirname(createRequire(import.meta.url).resolve('next/package.json'))],
      }),
    )
    expect(json.images).toHaveLength(1)
    for (const image of json.images) {
      const view = json.bufferViews[image.bufferView]
      const info = await sharp(
        bytes.subarray(start + view.byteOffset, start + view.byteOffset + view.byteLength),
      ).metadata()
      expect(info.width).toBe(1024)
      expect(info.height).toBe(1024)
    }
  })
})
