/** Native framebuffer size of the compiled DOOM WASM module - it always renders at this resolution. */
export const DOOM_SCREEN_WIDTH = 640
export const DOOM_SCREEN_HEIGHT = 400

/** Static asset path to the self-hosted WASM build, avoiding a runtime dependency on a third-party CDN. */
export const DOOM_WASM_URL = '/wasm/doom.wasm'

/** DOOM's own DOS-era key codes, distinct from `KeyboardEvent.keyCode` - used for both keyboard and touch input. */
export const DOOM_KEY_UP_ARROW = 0xad
export const DOOM_KEY_DOWN_ARROW = 0xaf
export const DOOM_KEY_LEFT_ARROW = 0xac
export const DOOM_KEY_RIGHT_ARROW = 0xae
export const DOOM_KEY_FIRE = 0x80 + 0x1d
export const DOOM_KEY_USE = 32
export const DOOM_KEY_ENTER = 13
export const DOOM_KEY_ESCAPE = 27
export const DOOM_KEY_BACKSPACE = 127
export const DOOM_KEY_ALT = 0x80 + 0x38

/**
 * Maps a browser `KeyboardEvent.keyCode` to the DOS-era scancode this DOOM build expects.
 * Mirrors DOOM's own key table: arrows, backspace and ctrl/alt get remapped, letters are
 * lower-cased, function keys are shifted, everything else passes through unchanged.
 */
export const mapBrowserKeyCodeToDoomKeyCode = (keyCode: number): number => {
  switch (keyCode) {
    case 8:
      return DOOM_KEY_BACKSPACE
    case 17:
      return DOOM_KEY_FIRE
    case 18:
      return DOOM_KEY_ALT
    case 37:
      return DOOM_KEY_LEFT_ARROW
    case 38:
      return DOOM_KEY_UP_ARROW
    case 39:
      return DOOM_KEY_RIGHT_ARROW
    case 40:
      return DOOM_KEY_DOWN_ARROW
    default:
      if (keyCode >= 65 && keyCode <= 90) {
        return keyCode + 32
      }
      if (keyCode >= 112 && keyCode <= 123) {
        return keyCode + 75
      }
      return keyCode
  }
}
