import { act, createElement, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useDoomFullscreen } from './useDoomFullscreen'

let root: Root
let host: HTMLDivElement
let nativeElement: Element | null
const screenRef = createRef<HTMLDivElement>()
const canvasRef = createRef<HTMLCanvasElement>()
const toggleRef = createRef<HTMLButtonElement>()
const playRef = createRef<HTMLButtonElement>()

const Harness = () => {
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useDoomFullscreen(
    screenRef,
    canvasRef,
    toggleRef,
    playRef,
  )
  return createElement(
    'div',
    { ref: screenRef, 'data-expanded': isFullscreen },
    createElement('canvas', { ref: canvasRef, tabIndex: 0 }),
    createElement('button', { ref: toggleRef, onClick: toggleFullscreen }, 'Toggle'),
    createElement('button', { ref: playRef, onClick: exitFullscreen }, 'Stop'),
  )
}

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  nativeElement = null
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => nativeElement,
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(createElement(Harness)))
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.removeAttribute('style')
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'fullscreenElement')
  Reflect.deleteProperty(document, 'exitFullscreen')
})

test('unmount restores existing page styles and inert state after viewport expansion', async () => {
  const background = document.createElement('button')
  background.inert = false
  document.body.prepend(background)
  document.body.style.overflow = 'clip'
  await act(async () => toggleRef.current?.click())
  expect(background.inert).toBe(true)
  expect(document.body.style.position).toBe('fixed')

  await act(async () => root.render(null))
  expect(background.inert).toBe(false)
  expect(document.body.style.position).toBe('')
  expect(document.body.style.overflow).toBe('clip')
  background.remove()
})

test('a native request rejected after Stop does not reopen the expanded screen', async () => {
  let rejectRequest: (_error: Error) => void = () => {}
  screenRef.current!.requestFullscreen = () =>
    new Promise<void>((_resolve, reject) => {
      rejectRequest = reject
    })
  await act(async () => toggleRef.current?.click())
  await act(async () => playRef.current?.click())
  await act(async () => rejectRequest(new Error('Permission denied')))
  expect(screenRef.current?.dataset.expanded).toBe('false')
  expect(document.body.style.position).toBe('')
  expect(document.activeElement).toBe(toggleRef.current)
})

test('a native request completed after Stop exits only the game fullscreen', async () => {
  let resolveRequest: () => void = () => {}
  const screen = screenRef.current!
  screen.requestFullscreen = () =>
    new Promise<void>((resolve) => {
      resolveRequest = resolve
    })
  document.exitFullscreen = async () => {
    nativeElement = null
    document.dispatchEvent(new Event('fullscreenchange'))
  }
  await act(async () => toggleRef.current?.click())
  await act(async () => playRef.current?.click())
  await act(async () => {
    nativeElement = screen
    resolveRequest()
  })
  expect(document.fullscreenElement).toBeNull()
  expect(screen.dataset.expanded).toBe('false')
})

test('unmount leaves another element in native fullscreen', async () => {
  const other = document.createElement('div')
  nativeElement = other
  document.exitFullscreen = async () => {
    nativeElement = null
  }
  await act(async () => root.render(null))
  expect(document.fullscreenElement).toBe(other)
})
