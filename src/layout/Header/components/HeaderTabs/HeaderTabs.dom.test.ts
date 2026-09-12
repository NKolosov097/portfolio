import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { HeaderTabs } from './HeaderTabs'
import { Providers } from '@/providers/Providers'
import { ELanguage, ETabID } from '@/constants/header.constants'
import { useHeaderStore } from '@/providers/stores/HeaderStore.provider'
import { useAsideStore } from '@/providers/stores/AsideStore.provider'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

/** Real section identifiers mounted by the fixture to exercise loading transitions. */
const TEST_SECTION_IDS: readonly ETabID[] = [
  ETabID.home,
  ETabID.portfolio,
  ETabID.aboutMe,
  ETabID.resume,
  ETabID.writing,
  ETabID.contact,
]

let root: Root
let host: HTMLDivElement

/** Exposes actual navigation state so a failed click cannot silently change the selected tab. */
const Selection = () => {
  const currentTab = useHeaderStore((state) => state.currentTab)
  const isOpenDrawer = useAsideStore((state) => state.isOpenDrawer)
  return createElement('output', { 'data-drawer-open': isOpenDrawer }, currentTab)
}

const Harness = ({ hasSections }: { hasSections: boolean }) =>
  createElement(
    Providers,
    { initialLanguage: ELanguage.en },
    createElement(HeaderTabs),
    createElement(Selection),
    createElement(
      'main',
      null,
      ...(hasSections
        ? TEST_SECTION_IDS.map((id, index) =>
            createElement('section', {
              key: id,
              id,
              ref: (element: HTMLElement | null) => {
                if (element) Object.defineProperty(element, 'offsetTop', { value: index * 500 })
              },
            }),
          )
        : [createElement('div', { key: 'loading' }, 'Loading')]),
    ),
  )

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

test('tabs are disabled during loading and recover when sections arrive without a scroll event', async () => {
  await act(async () => root.render(createElement(Harness, { hasSections: false })))
  const tabs = host.querySelectorAll<HTMLElement>('[role="tab"]')
  expect(tabs.length).toBe(6)
  for (const tab of tabs) {
    expect(tab.getAttribute('aria-disabled')).toBe('true')
    expect(tab.tabIndex).toBe(-1)
  }

  const error = vi.spyOn(console, 'error')
  await act(async () => {
    tabs[1].click()
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    host.querySelector<HTMLButtonElement>('[data-testid="header-open-profile"]')?.click()
  })
  expect(host.querySelector('output')?.textContent).toBe(ETabID.home)
  expect(host.querySelector('output')?.getAttribute('data-drawer-open')).toBe('true')
  expect(error).not.toHaveBeenCalled()

  await act(async () => root.render(createElement(Harness, { hasSections: true })))
  for (const tab of tabs) expect(tab.getAttribute('aria-disabled')).toBe('false')

  await act(async () => {
    document.getElementById(ETabID.portfolio)?.setAttribute('hidden', '')
  })
  for (const tab of tabs) expect(tab.getAttribute('aria-disabled')).toBe('true')
  await act(async () => {
    document.getElementById(ETabID.portfolio)?.removeAttribute('hidden')
  })
  for (const tab of tabs) expect(tab.getAttribute('aria-disabled')).toBe('false')

  await act(async () => root.render(createElement(Harness, { hasSections: false })))
  for (const tab of tabs) expect(tab.getAttribute('aria-disabled')).toBe('true')
})

test('a missing section at click time does not change selection or log an error', async () => {
  await act(async () => root.render(createElement(Harness, { hasSections: true })))
  const error = vi.spyOn(console, 'error')
  const portfolioTab = host.querySelectorAll<HTMLElement>('[role="tab"]')[1]

  await act(async () => {
    // Remove and click in the same task, before MutationObserver can disable the tab.
    document.getElementById(ETabID.portfolio)?.remove()
    portfolioTab.click()
  })

  expect(host.querySelector('output')?.textContent).toBe(ETabID.home)
  expect(window.scrollTo).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
})
