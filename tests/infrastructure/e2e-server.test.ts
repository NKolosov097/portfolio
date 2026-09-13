import { spawnSync } from 'node:child_process'
import net from 'node:net'

import { afterEach, describe, expect, it } from 'vitest'

import {
  getE2EBaseUrl,
  isServerListening,
  parseE2EPort,
  startE2EServer,
  stopE2EServer,
} from '../../e2e/helpers/server'

const TEST_HOST = '127.0.0.1'

const CHILD_SERVER_SOURCE = String.raw`
  const net = require('node:net')
  const port = Number(process.argv[1])
  const server = net.createServer((socket) => socket.end())
  server.listen(port, '127.0.0.1')
  const stop = () => server.close(() => process.exit(0))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
`

const listen = (server: net.Server, port = 0): Promise<number> =>
  new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, TEST_HOST, () => {
      server.off('error', reject)

      const address = server.address()

      if (address === null || typeof address === 'string') {
        reject(new Error('Expected the listener to have a numeric TCP address.'))
        return
      }

      resolve(address.port)
    })
  })

const close = (server: net.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })

const reserveFreePort = async (): Promise<number> => {
  const reservation = net.createServer()
  const port = await listen(reservation)
  await close(reservation)

  return port
}

afterEach(async () => {
  await stopE2EServer()
})

describe('E2E port configuration', () => {
  it.each([['0'], ['-1'], ['65536'], ['3.5'], ['3000px'], [''], ['  ']])(
    'rejects invalid E2E_PORT value %j',
    (value) => {
      expect(() => parseE2EPort(value)).toThrow(`Invalid E2E_PORT: ${JSON.stringify(value)}`)
    },
  )

  it('defaults to port 3000 and derives the matching base URL', () => {
    expect(parseE2EPort(undefined)).toBe(3000)
    expect(getE2EBaseUrl(3100)).toBe('http://localhost:3100')
  })

  it(
    'loads the real Playwright configuration through its CLI transform',
    { timeout: 30_000 },
    () => {
      const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
      const args =
        process.platform === 'win32'
          ? ['/d', '/s', '/c', 'pnpm.cmd exec playwright test --list']
          : ['exec', 'playwright', 'test', '--list']
      const result = spawnSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, E2E_PORT: '3100' },
        timeout: 25_000,
        windowsHide: true,
      })
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

      expect(result.error, output).toBeUndefined()
      expect(result.status, output).toBe(0)
    },
  )
})

describe('E2E server lifecycle', () => {
  it('rejects an occupied port without stopping its listener', async () => {
    const foreignListener = net.createServer((socket) => socket.end())
    const occupiedPort = await listen(foreignListener)

    try {
      await expect(
        startE2EServer({
          port: occupiedPort,
          command: process.execPath,
          args: ['-e', CHILD_SERVER_SOURCE, String(occupiedPort)],
        }),
      ).rejects.toThrow(`Port ${occupiedPort} is already in use`)
      await expect(isServerListening(occupiedPort)).resolves.toBe(true)
    } finally {
      await close(foreignListener)
    }
  })

  it('reports a child that exits before opening the port', async () => {
    const port = await reserveFreePort()

    await expect(
      startE2EServer({
        port,
        command: process.execPath,
        args: ['-e', "process.stderr.write('controlled startup failure'); process.exit(23)"],
        readyTimeoutMs: 2_000,
        probeIntervalMs: 10,
      }),
    ).rejects.toThrow(/exited with code 23[\s\S]*controlled startup failure/)

    await expect(isServerListening(port)).resolves.toBe(false)
  })

  it('stops only its spawned child while another listener remains occupied', async () => {
    const foreignListener = net.createServer((socket) => socket.end())
    const foreignPort = await listen(foreignListener)
    const ownedPort = await reserveFreePort()

    try {
      await expect(isServerListening(foreignPort)).resolves.toBe(true)

      await startE2EServer({
        port: ownedPort,
        command: process.execPath,
        args: ['-e', CHILD_SERVER_SOURCE, String(ownedPort)],
        readyTimeoutMs: 2_000,
        probeIntervalMs: 10,
      })

      await expect(isServerListening(ownedPort)).resolves.toBe(true)

      await stopE2EServer()

      await expect(isServerListening(ownedPort)).resolves.toBe(false)
      await expect(isServerListening(foreignPort)).resolves.toBe(true)
    } finally {
      await close(foreignListener)
    }
  })
})
