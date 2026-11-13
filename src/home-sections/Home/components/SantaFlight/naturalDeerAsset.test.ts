import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadNaturalDeerGLTFFixture } from './naturalDeerAsset.fixture'

afterEach(() => vi.restoreAllMocks())

describe('natural deer CPU template', () => {
  it('deduplicates preparation, keeps the ready template and retries a rejected request', async () => {
    const gltf = await loadNaturalDeerGLTFFixture()
    const { scene } = gltf
    vi.resetModules()
    const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync')
    load.mockRejectedValueOnce(new Error('Temporary asset failure'))
    const asset = await import('./naturalDeerAsset')
    expect(() => asset.getNaturalDeer()).toThrow('not finished loading')
    const failed = asset.prepareNaturalDeer()
    expect(asset.prepareNaturalDeer()).toBe(failed)
    await expect(failed).rejects.toThrow('Temporary asset failure')
    load.mockResolvedValueOnce(gltf)
    const pending = asset.prepareNaturalDeer()
    expect(asset.prepareNaturalDeer()).toBe(pending)
    await pending
    expect(asset.getNaturalDeer()).toBe(scene)
    await asset.prepareNaturalDeer()
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('/assets/models/winter/natural-deer-v2.glb')
  })

  it('rejects an incomplete template before a GPU scene can consume it', async () => {
    const gltf = await loadNaturalDeerGLTFFixture()
    vi.resetModules()
    const scene = new Group()
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValueOnce({ ...gltf, scene })
    const asset = await import('./naturalDeerAsset')
    await expect(asset.prepareNaturalDeer()).rejects.toThrow('eleven-bone')
    expect(() => asset.getNaturalDeer()).toThrow('not finished loading')
  })

  it('embeds the real coat image and stores no unused binary vertex arrays', async () => {
    const bytes = await readFile(path.resolve('public/assets/models/winter/natural-deer-v2.glb'))
    expect(bytes.length).toBeLessThan(1_500_000)
    const json: {
      images: { bufferView: number; mimeType: string }[]
      bufferViews: { byteOffset: number }[]
      accessors: { type: string; count: number }[]
      extensionsRequired: string[]
      buffers: { byteLength: number }[]
    } = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)))
    const image = json.images[0]
    const view = json.bufferViews[image.bufferView]
    const start = 28 + bytes.readUInt32LE(12) + view.byteOffset
    expect(image.mimeType).toBe('image/webp')
    expect(bytes.toString('ascii', start, start + 4)).toBe('RIFF')
    expect(bytes.toString('ascii', start + 8, start + 12)).toBe('WEBP')
    expect(json.extensionsRequired).toEqual(['EXT_texture_webp'])
    expect(
      json.accessors.filter((accessor: { type: string }) => accessor.type === 'VEC3'),
    ).toHaveLength(2)
    expect(json.accessors[0].count).toBe(17_294)
    expect(json.buffers[0].byteLength + 28 + bytes.readUInt32LE(12)).toBe(bytes.length)
  })
})
