import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))

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
    environment: 'node',
    fileParallelism: false,
    include: ['tests/infrastructure/**/*.test.ts'],
    reporters: [['verbose', { summary: true }]],
    slowTestThreshold: 1_000,
  },
})
