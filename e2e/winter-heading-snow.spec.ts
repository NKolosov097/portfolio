import { expect, test, type Page } from '@playwright/test'
import { APPEARANCE_COOKIE_KEY, EAppearance } from '@/constants/theme.constants'
import { ELanguage } from '@/constants/header.constants'
import { LANG_COOKIE_KEY } from '@/helpers/language'
import { selectLanguage } from './helpers/language'

/** Wait for actual owned effects, including retained endpoints in reduced motion. */
async function expectPhase(page: Page, phase: number) {
  await expect
    .poll(() =>
      page.locator('[data-snow-support]').evaluateAll((nodes, target) => {
        const tracks = nodes.flatMap((node) => node.getAnimations())
        return (
          [...document.querySelectorAll('[data-snow-word]')].every((word) =>
            word.querySelector('[data-snow-support]'),
          ) &&
          tracks.length === nodes.length &&
          tracks.length > 0 &&
          tracks.every(
            (track) =>
              typeof track.currentTime === 'number' &&
              Math.abs(track.currentTime - target * 2_000) < 0.1,
          )
        )
      }, phase),
    )
    .toBe(true)
}

/** Freeze only snow after the real entry timer has completed, then seek its shared clock. */
async function seekPhase(page: Page, phase: number) {
  await page.locator('[data-snow-support]').evaluateAll(async (nodes, q) => {
    const tracks = nodes.flatMap((node) => node.getAnimations())
    if (tracks.length !== nodes.length) throw new Error('Expected owned polygon tracks.')
    for (const track of tracks) track.pause()
    await Promise.all(tracks.map((track) => track.ready))
    for (const track of tracks) track.currentTime = q * 2_000
  }, phase)
  // A screenshot establishes actual paint before WebKit computed-style readback or cloning.
  await page.getByTestId('home-heading').screenshot({ animations: 'allow' })
}

/** Read approved visible artwork independently of masks and generated IDs. */
async function artwork(page: Page) {
  return page.locator('[data-testid="home-heading-snow"] > g > path').evaluateAll((paths) =>
    paths.map((path) => ({
      d: path.getAttribute('d'),
      pocket: path.getAttribute('data-snow-pocket'),
      corner: path.getAttribute('data-snow-corner'),
      inner: path.getAttribute('data-snow-inner-lip'),
      hanging: path.getAttribute('data-snow-hanging'),
      extra: path.getAttribute('data-snow-extra-lip'),
      opacity: path.getAttribute('opacity'),
      fill: getComputedStyle(path).fill,
      filter: path.parentElement ? getComputedStyle(path.parentElement).filter : '',
      viewBox:
        path instanceof SVGPathElement ? path.ownerSVGElement?.getAttribute('viewBox') : null,
    })),
  )
}

/** Rasterize the actual SVG mask union, freezing native polygon readback after a painted seek. */
async function coverage(page: Page, endpoint = false) {
  return page.locator('[data-testid="home-heading-snow"] > g > path').evaluateAll(
    async (nodes, fullEndpoint) =>
      Promise.all(
        nodes.map(async (node) => {
          if (!(node instanceof SVGPathElement) || !node.ownerSVGElement)
            throw new Error('Expected visible snow.')
          const id = node.getAttribute('mask')?.slice(5, -1)
          const sourceMask = id ? document.getElementById(id) : null
          if (!sourceMask) throw new Error('Expected the actual mask.')
          const box = node.ownerSVGElement.viewBox.baseVal
          const width = Math.ceil(box.width * 4),
            height = Math.ceil(box.height * 4)
          const ns = 'http://www.w3.org/2000/svg'
          const mask = sourceMask.cloneNode(true)
          if (!(mask instanceof SVGMaskElement)) throw new Error('Expected a cloned SVG mask.')
          const originals = [...sourceMask.querySelectorAll('rect[data-snow-support]')]
          for (const [index, rect] of [
            ...mask.querySelectorAll<SVGRectElement>('rect[data-snow-support]'),
          ].entries()) {
            const original = originals[index]
            const animation = original.getAnimations()[0]
            const frames =
              animation?.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : []
            const finalClip = frames[frames.length - 1]?.clipPath
            rect.style.clipPath =
              fullEndpoint && typeof finalClip === 'string'
                ? finalClip
                : getComputedStyle(original).clipPath
          }
          /** Render identical white artwork with or without its actual frozen browser mask. */
          async function raster(masked: boolean) {
            const svg = document.createElementNS(ns, 'svg')
            svg.setAttribute('xmlns', ns)
            svg.setAttribute('width', String(width))
            svg.setAttribute('height', String(height))
            svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
            if (masked) {
              const defs = document.createElementNS(ns, 'defs')
              defs.append(mask.cloneNode(true))
              svg.append(defs)
            }
            const path = document.createElementNS(ns, 'path')
            path.setAttribute('d', node.getAttribute('d') ?? '')
            path.setAttribute('fill', '#fff')
            if (masked && id) path.setAttribute('mask', `url(#${id})`)
            svg.append(path)
            const url = URL.createObjectURL(
              new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
            )
            try {
              const image = new Image()
              await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve()
                image.onerror = () => reject(new Error('Snow mask raster failed.'))
                image.src = url
              })
              const canvas = document.createElement('canvas')
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              if (!ctx) throw new Error('Expected coverage canvas.')
              ctx.drawImage(image, 0, 0)
              return ctx.getImageData(0, 0, width, height).data
            } finally {
              URL.revokeObjectURL(url)
            }
          }
          const [all, shown] = await Promise.all([raster(false), raster(true)])
          const floorCanvas = document.createElement('canvas')
          floorCanvas.width = width
          floorCanvas.height = height
          const floor = floorCanvas.getContext('2d')
          if (!floor) throw new Error('Expected floor canvas.')
          floor.scale(4, 4)
          const bodyD = sourceMask.querySelector('clipPath path')?.getAttribute('d')
          floor.fill(new Path2D(bodyD ?? node.getAttribute('d') ?? ''))
          const body = floor.getImageData(0, 0, width, height).data
          let total = 0,
            covered = 0,
            outside = 0,
            mean = 0
          for (let i = 3; i < all.length; i += 4) {
            total += all[i]
            const amount = Math.min(all[i], shown[i])
            covered += amount
            mean += (amount * Math.floor((i - 3) / 4 / width)) / 4
            if (body[i] === 0) outside += amount
          }
          return {
            coverage: covered / total,
            outside,
            meanY: covered ? mean / covered : 0,
            hasLip: Boolean(bodyD),
            corner: node.getAttribute('data-snow-corner'),
            motion: sourceMask
              .querySelector('[data-snow-motion]')
              ?.getAttribute('data-snow-motion'),
          }
        }),
      ),
    endpoint,
  )
}

/** Keep real selectable translated text and wrapping intact. */
async function expectLiveHeading(page: Page) {
  const selected = await page.getByTestId('home-heading').evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? ''
    selection?.removeAllRanges()
    return text
  })
  await expect(page.getByTestId('home-heading')).toHaveAccessibleName(selected)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: APPEARANCE_COOKIE_KEY, value: EAppearance.winter, domain: 'localhost', path: '/' },
    { name: LANG_COOKIE_KEY, value: ELanguage.en, domain: 'localhost', path: '/' },
  ])
})

test('retains approved artwork, materials, selection and sparkle through theme changes', async ({
  page,
}) => {
  await page.goto('/')
  await expectPhase(page, 1)
  await expect(page.getByTestId('home-heading')).toHaveAccessibleName("I'm Nikita Kolosov")
  await expect(page.locator('[data-snow-pocket]')).toHaveCount(7)
  await expect(page.locator('[data-snow-lip-support]')).toHaveCount(8)
  const before = await artwork(page)
  for (const ch of ['k', 'K']) {
    const filter = await page
      .locator(`[data-snow-corner="${ch}"]`)
      .evaluate((node) => (node.parentElement ? getComputedStyle(node.parentElement).filter : ''))
    expect(filter).toContain('#home-snow-hanging-contact')
  }
  await expect(page.getByTestId('home-sparkle')).toHaveCount(1)
  await page.getByTestId('appearance-toggle-switch').click()
  await expectPhase(page, 0)
  expect(await artwork(page)).toEqual(before)
  await page.getByTestId('appearance-toggle-switch').click()
  await expectPhase(page, 1)
  expect(await artwork(page)).toEqual(before)
  await expectLiveHeading(page)
})

test('replaces locale geometry and keeps full physical masks without duplicate definitions', async ({
  page,
}) => {
  await page.goto('/')
  await expectPhase(page, 1)
  for (const patch of await coverage(page, true))
    expect(patch.coverage).toBeGreaterThanOrEqual(0.999)
  await selectLanguage(page, ELanguage.ru)
  await expectPhase(page, 1)
  await expect(page.getByTestId('home-heading')).toHaveAccessibleName('Я - Никита Колосов')
  await expect(page.locator('[data-snow-pocket]')).toHaveCount(0)
  await expect(page.locator('[data-snow-support]')).toHaveCount(20)
  for (const patch of await coverage(page, true))
    expect(patch.coverage).toBeGreaterThanOrEqual(0.999)
  await expectLiveHeading(page)
  await selectLanguage(page, ELanguage.en)
  await expectPhase(page, 1)
  const ids = await page.locator('mask').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of [
    'home-snow-inner-fill',
    'home-snow-inner-contact',
    'home-snow-hanging-fill',
    'home-snow-hanging-contact',
  ])
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
})

test('grows supported bodies before lips and thins immediately from full volume', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expectPhase(page, 1)
  const reference = await artwork(page)
  await seekPhase(page, 0)
  for (const patch of await coverage(page)) expect(patch.coverage).toBe(0)
  await seekPhase(page, 0.15)
  const early = await coverage(page)
  expect(early.some((patch) => patch.coverage > 0)).toBe(true)
  for (const patch of early.filter((entry) => entry.hasLip)) expect(patch.outside).toBe(0)
  await seekPhase(page, 0.5)
  const half = await coverage(page)
  for (const patch of half) {
    expect(patch.coverage).toBeGreaterThan(0)
    expect(patch.coverage).toBeLessThan(0.999)
  }
  await testInfo.attach('half-grown-heading', {
    body: await page.getByTestId('home-heading').screenshot(),
    contentType: 'image/png',
  })
  await seekPhase(page, 0.7)
  for (const patch of (await coverage(page)).filter((entry) => entry.hasLip))
    expect(patch.outside).toBe(0)
  await seekPhase(page, 0.85)
  expect(
    (await coverage(page)).filter((patch) => patch.hasLip).every((patch) => patch.outside > 0),
  ).toBe(true)
  await seekPhase(page, 0.99)
  const thinning = await page
    .locator('[data-snow-motion]')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).clipPath))
  await seekPhase(page, 1)
  const complete = await page
    .locator('[data-snow-motion]')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).clipPath))
  expect(thinning.some((clip, index) => clip !== complete[index])).toBe(true)
  for (const patch of await coverage(page, true))
    expect(patch.coverage).toBeGreaterThanOrEqual(0.999)
  expect(await artwork(page)).toEqual(reference)
})

test('preserves native phase on reversal and cancels pending winter entry', async ({ page }) => {
  await page.goto('/')
  await expectPhase(page, 1)
  const toggle = page.getByTestId('appearance-toggle-switch')
  for (const q of [0.15, 0.5, 0.85]) {
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.original)
    await seekPhase(page, q)
    await toggle.evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw new Error('Expected the appearance control.')
      node.click()
    })
    await expect(page.locator('html')).toHaveAttribute('data-appearance', EAppearance.winter)
    const snapshot = await page.locator('[data-snow-word]').evaluateAll((words) =>
      words.map((word) => {
        const tracks = [...word.querySelectorAll('[data-snow-support]')].flatMap((node) =>
          node.getAnimations(),
        )
        const times = tracks.map((track) => Number(track.currentTime))
        return {
          spread: Math.max(...times) - Math.min(...times),
          rate: tracks[0]?.playbackRate,
          state: tracks[0]?.playState,
          time: times[0],
        }
      }),
    )
    for (const fragment of snapshot) {
      expect(fragment.spread).toBeLessThan(0.05)
      expect(fragment.state).toBe('paused')
      expect(Math.abs(fragment.time - q * 2_000)).toBeLessThan(0.05)
    }
    await expectPhase(page, 1)
  }
  await toggle.click()
  await expectPhase(page, 0)
  await toggle.click()
  await toggle.click()
  await expectPhase(page, 0)
  await page.waitForTimeout(350)
  await expectPhase(page, 0)
})

test('settles initial/live reduced motion without replay when normal motion resumes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expectPhase(page, 1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expectPhase(page, 1)
  await page.getByTestId('appearance-toggle-switch').click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expectPhase(page, 0)
  await page.getByTestId('appearance-toggle-switch').click()
  await expectPhase(page, 1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expectPhase(page, 1)
  expect(
    await page
      .locator('[data-snow-support]')
      .evaluateAll((nodes) =>
        nodes.every((node) => node.getAnimations().every((track) => track.playState === 'paused')),
      ),
  ).toBe(true)
})

test('recalibrates layout on the same effects and discards stale font/locale preparation', async ({
  page,
}) => {
  await page.goto('/')
  await expectPhase(page, 1)
  await seekPhase(page, 0.5)
  const retained = await page
    .locator('[data-snow-support]')
    .first()
    .evaluateHandle((node) => ({
      animation: node.getAnimations()[0],
      effect: node.getAnimations()[0].effect,
    }))
  const before = await artwork(page)
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected viewport.')
  await page.setViewportSize({ width: viewport.width > 600 ? 1_025 : 420, height: viewport.height })
  await expect
    .poll(() =>
      retained.evaluate((owned) => ({
        time: owned.animation.currentTime,
        sameEffect: owned.animation.effect === owned.effect,
      })),
    )
    .toEqual({ time: 1_000, sameEffect: true })
  expect(await artwork(page)).toEqual(before)
  await selectLanguage(page, ELanguage.ru)
  await expectPhase(page, 1)
  await expect(page.locator('[data-snow-glyph="N"]')).toHaveCount(0)
  await expectLiveHeading(page)
  await page
    .context()
    .addCookies([{ name: LANG_COOKIE_KEY, value: ELanguage.en, domain: 'localhost', path: '/' }])
  await page.addInitScript(() => {
    const load = document.fonts.load.bind(document.fonts)
    let held = 0
    // Hold only the first fragment set so a later locale can prepare independently.
    document.fonts.load = (font, text) => {
      if (font !== '700 200px Inter' || held === 4) return load(font, text)
      document.documentElement.setAttribute('data-snow-font-held', String(++held))
      return new Promise<FontFace[]>((resolve, reject) => {
        document.addEventListener(
          'release-snow-font',
          () => {
            void load(font, text).then(resolve, reject)
          },
          { once: true },
        )
      })
    }
    // New normal-motion masks must remain at zero until their own arming boundary.
    const observer = new MutationObserver(() => {
      for (const node of document.querySelectorAll(
        '[data-snow-active="false"] [data-snow-support]',
      )) {
        if (
          node
            .getAnimations()
            .some((track) => typeof track.currentTime === 'number' && track.currentTime > 0)
        )
          document.documentElement.setAttribute('data-snow-unarmed-flash', 'true')
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-snow-font-held', '4')
  await expect(page.locator('[data-snow-support]')).toHaveCount(0)
  await page.getByTestId('appearance-toggle-switch').click()
  await selectLanguage(page, ELanguage.ru)
  await page.evaluate(() => document.dispatchEvent(new Event('release-snow-font')))
  await expect(page.locator('[data-snow-support]')).toHaveCount(0)
  await page.getByTestId('appearance-toggle-switch').click()
  await expectPhase(page, 1)
  await expect(page.locator('[data-snow-glyph="N"]')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveAttribute('data-snow-unarmed-flash', 'true')
})
