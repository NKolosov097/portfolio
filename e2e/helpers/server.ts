import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import { resolve as resolvePath } from 'node:path'

const DEFAULT_E2E_PORT = 3000
const MAX_PORT = 65_535
const READY_TIMEOUT_MS = 120_000
const PROBE_INTERVAL_MS = 250
const STOP_TIMEOUT_MS = 5_000
const MAX_CAPTURED_OUTPUT_CHARS = 4_000
const STATE_KEY = '__portfolioE2EServerState'

interface E2EServerState {
  child?: ChildProcess
  starting?: boolean
}

interface GlobalWithE2EServerState {
  __portfolioE2EServerState?: E2EServerState
}

export interface StartE2EServerOptions {
  port?: number
  command?: string
  args?: readonly string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  readyTimeoutMs?: number
  probeIntervalMs?: number
}

const serverGlobal = globalThis as GlobalWithE2EServerState
const state = serverGlobal[STATE_KEY] ?? {}

serverGlobal[STATE_KEY] = state

/** Parses a TCP port from E2E_PORT, retaining 3000 only when the variable is absent. */
export const parseE2EPort = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_E2E_PORT
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `Invalid E2E_PORT: ${JSON.stringify(value)}. Expected an integer from 1 to 65535.`,
    )
  }

  const port = Number(value)

  if (!Number.isSafeInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(
      `Invalid E2E_PORT: ${JSON.stringify(value)}. Expected an integer from 1 to 65535.`,
    )
  }

  return port
}

/** Port shared by Playwright's server, base URL and teardown lifecycle. */
export const E2E_PORT = parseE2EPort(process.env.E2E_PORT)

/** Builds the origin used by every browser project. */
export const getE2EBaseUrl = (port: number): string => `http://localhost:${port}`

export const E2E_BASE_URL = getE2EBaseUrl(E2E_PORT)

/** Resolves to true when a process is accepting TCP connections on the requested port. */
export const isServerListening = (port = E2E_PORT): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })

    const settle = (isListening: boolean) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(isListening)
    }

    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })

const isRunning = (child: ChildProcess): boolean =>
  child.exitCode === null && child.signalCode === null

const setOwnedChild = (child: ChildProcess | undefined): void => {
  state.child = child
}

const setStarting = (starting: boolean): void => {
  state.starting = starting
}

const waitForExit = (child: ChildProcess, timeoutMs: number): Promise<boolean> => {
  if (!isRunning(child)) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.off('exit', onExit)
      resolve(false)
    }, timeoutMs)

    const onExit = () => {
      clearTimeout(timeout)
      resolve(true)
    }

    child.once('exit', onExit)
  })
}

const terminate = async (child: ChildProcess): Promise<void> => {
  if (!isRunning(child)) {
    return
  }

  child.kill()

  if (await waitForExit(child, STOP_TIMEOUT_MS)) {
    return
  }

  child.kill('SIGKILL')
  await waitForExit(child, STOP_TIMEOUT_MS)
}

const appendOutput = (current: string, chunk: string): string =>
  (current + chunk).slice(-MAX_CAPTURED_OUTPUT_CHARS)

const describeOutput = (output: string): string => {
  const trimmedOutput = output.trim()

  return trimmedOutput.length > 0 ? `\n\nServer output:\n${trimmedOutput}` : ''
}

/** Starts and retains one direct child process after proving its requested port is free. */
export const startE2EServer = async (options: StartE2EServerOptions = {}): Promise<void> => {
  const port = parseE2EPort(String(options.port ?? E2E_PORT))

  if (state.starting === true || (state.child !== undefined && isRunning(state.child))) {
    throw new Error('The E2E suite already owns a running server process.')
  }

  setStarting(true)
  setOwnedChild(undefined)

  if (await isServerListening(port)) {
    setStarting(false)
    throw new Error(
      `Port ${port} is already in use. The E2E suite will not stop a process it did not start.`,
    )
  }

  const requireFromProject = createRequire(resolvePath(process.cwd(), 'package.json'))
  const command = options.command ?? process.execPath
  const args = options.args ?? [
    requireFromProject.resolve('next/dist/bin/next'),
    'start',
    '--port',
    String(port),
  ]
  const readyTimeoutMs = options.readyTimeoutMs ?? READY_TIMEOUT_MS
  const probeIntervalMs = options.probeIntervalMs ?? PROBE_INTERVAL_MS
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  setOwnedChild(child)
  setStarting(false)

  let capturedOutput = ''
  let failureReason: string | undefined

  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => {
    capturedOutput = appendOutput(capturedOutput, chunk)
  })
  child.stderr?.on('data', (chunk: string) => {
    capturedOutput = appendOutput(capturedOutput, chunk)
  })
  child.once('error', (error: Error) => {
    failureReason = `it could not be started (${error.message})`
  })
  child.once('exit', (code, signal) => {
    failureReason = signal ? `it was killed by ${signal}` : `it exited with code ${code}`
  })

  try {
    const deadline = Date.now() + readyTimeoutMs

    while (Date.now() < deadline) {
      if (failureReason !== undefined) {
        throw new Error(
          `The E2E server stopped before it accepted connections: ${failureReason}.` +
            describeOutput(capturedOutput),
        )
      }

      if (await isServerListening(port)) {
        return
      }

      await new Promise((resolve) => setTimeout(resolve, probeIntervalMs))
    }

    throw new Error(
      `The E2E server did not start listening on port ${port} within ${readyTimeoutMs}ms.` +
        describeOutput(capturedOutput),
    )
  } catch (error) {
    setStarting(false)

    if (state.child === child) {
      setOwnedChild(undefined)
    }

    await terminate(child)
    throw error
  }
}

/** Stops only the child retained by startE2EServer; unrelated listeners are never discovered. */
export const stopE2EServer = async (): Promise<void> => {
  const child = state.child

  if (child === undefined) {
    return
  }

  setOwnedChild(undefined)
  await terminate(child)
}
