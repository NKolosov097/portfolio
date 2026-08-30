import {
  DOOM_SCREEN_HEIGHT,
  DOOM_SCREEN_WIDTH,
} from '@/home-sections/Resume/sections/RetroArcade/doom/doomConstants'

/** Linear memory pages (64 KiB each) the compiled module expects the host to provide. */
const DOOM_MEMORY_PAGES = 108

const BROWSER_EVENT_KEY_DOWN = 0
const BROWSER_EVENT_KEY_UP = 1

export interface DoomEngineOptions {
  /** Static URL of the WASM binary, fetched via `WebAssembly.instantiateStreaming`. */
  wasmUrl: string
  /** Invoked once per frame with the full RGBA framebuffer, ready for `ImageData`. */
  onFrame: (screen: Uint8ClampedArray) => void
}

interface DoomWasmExports extends WebAssembly.Exports {
  main: () => void
  doom_loop_step: () => void
  add_browser_event: (eventType: number, keyCode: number) => void
}

/** Narrows the untyped WASM export record without asserting — every field is checked to actually be callable. */
const isDoomWasmExports = (wasmExports: WebAssembly.Exports): wasmExports is DoomWasmExports =>
  typeof wasmExports.main === 'function' &&
  typeof wasmExports.doom_loop_step === 'function' &&
  typeof wasmExports.add_browser_event === 'function'

/**
 * Boots the id Software DOOM WASM build (GPL-2.0; shareware WAD baked into the binary, no DOS
 * emulation layer) and drives it with a cancellable `requestAnimationFrame` loop. The upstream
 * reference implementation this is based on never exposes a way to stop that loop; `stop()`
 * fills that gap so the engine doesn't keep burning CPU once the player leaves the machine.
 */
export class DoomEngine {
  private readonly memory = new WebAssembly.Memory({ initial: DOOM_MEMORY_PAGES })
  private readonly wasmUrl: string
  private readonly onFrame: (screen: Uint8ClampedArray) => void
  private wasmExports: DoomWasmExports | null = null
  private animationFrameId: number | null = null

  constructor({ wasmUrl, onFrame }: DoomEngineOptions) {
    this.wasmUrl = wasmUrl
    this.onFrame = onFrame
  }

  /** Fetches and instantiates the WASM module, runs its entry point, then starts the step loop. */
  public async start(): Promise<void> {
    const { instance } = await WebAssembly.instantiateStreaming(fetch(this.wasmUrl), {
      js: {
        js_console_log: () => {},
        js_stdout: () => {},
        js_stderr: () => {},
        js_draw_screen: this.handleDrawScreen,
        js_milliseconds_since_start: () => performance.now(),
      },
      env: {
        memory: this.memory,
      },
    })

    if (!isDoomWasmExports(instance.exports)) {
      throw new Error('DOOM WASM build is missing expected exports')
    }

    this.wasmExports = instance.exports
    this.wasmExports.main()
    this.loop()
  }

  /** Cancels the render loop; the WASM instance and its memory become eligible for GC once dropped. */
  public stop(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.wasmExports = null
  }

  /** Forwards a key transition using DOOM's own key codes (see `doomConstants.ts`). */
  public sendKey(keyCode: number, isKeyDown: boolean): void {
    this.wasmExports?.add_browser_event(
      isKeyDown ? BROWSER_EVENT_KEY_DOWN : BROWSER_EVENT_KEY_UP,
      keyCode,
    )
  }

  private readonly handleDrawScreen = (offset: number): void => {
    const screen = new Uint8ClampedArray(
      this.memory.buffer,
      offset,
      DOOM_SCREEN_WIDTH * DOOM_SCREEN_HEIGHT * 4,
    )
    this.onFrame(screen)
  }

  private readonly loop = (): void => {
    this.wasmExports?.doom_loop_step()
    this.animationFrameId = window.requestAnimationFrame(this.loop)
  }
}
