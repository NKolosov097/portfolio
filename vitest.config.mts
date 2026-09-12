import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/** Absolute repository root, derived from this file so aliases resolve on POSIX and Windows alike. */
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))

/** Suffix that opts a test file into the jsdom environment instead of plain node. */
const DOM_TEST_GLOB = 'src/**/*.dom.test.ts'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: path.join(ROOT_DIR, 'src/$1') },
      { find: /^@public\/(.*)$/, replacement: path.join(ROOT_DIR, 'public/$1') },
      { find: /^@tests\/(.*)$/, replacement: path.join(ROOT_DIR, 'tests/$1') },
    ],
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    reporters: [['verbose', { summary: true }]],
    slowTestThreshold: 100,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['**/node_modules/**', DOM_TEST_GLOB],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          server: { deps: { inline: [/@gravity-ui\/uikit/] } },
          include: [DOM_TEST_GLOB],
        },
      },
    ],
  },
})
