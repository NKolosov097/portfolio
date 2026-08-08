import { spawn } from 'node:child_process'
import net from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

import { E2E_PORT, isServerListening, stopServer } from './helpers/server'

/** How long the production server may take to accept connections before the run is abandoned. */
const READY_TIMEOUT_MS = 120_000

/** Gap between readiness probes. */
const PROBE_INTERVAL_MS = 250

/** Upper bound on retained server output, so a boot loop cannot grow the buffer without end. */
const MAX_CAPTURED_OUTPUT_CHARS = 4_000

/** Next's CLI entry, resolved through the package so the path survives cwd and version changes. */
const NEXT_BIN_PATH = require.resolve('next/dist/bin/next')

/** Appends whatever the server printed to an error message, so a failed boot is diagnosable. */
const describeOutput = (output: string): string => {
  const trimmedOutput = output.trim()

  return trimmedOutput.length > 0 ? `\n\nServer output:\n${trimmedOutput}` : ''
}

/** Starts the production server; Playwright's `webServer` cannot stop `next start` on Windows. */
export default async function globalSetup(): Promise<void> {
  if (await isServerListening()) {
    throw new Error(
      `Port ${E2E_PORT} is already in use. The E2E suite starts and stops its own server, ` +
        `so stop the running one first.`,
    )
  }

  const server = spawn(process.execPath, [NEXT_BIN_PATH, 'start', '--port', String(E2E_PORT)], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })

  /** Tail of the server's stderr, kept for the error message if it never becomes reachable. */
  let capturedOutput = ''

  /** Reasons the server can never become reachable, appended by its lifecycle events. */
  const failureReasons: string[] = []

  server.stderr?.setEncoding('utf8')

  server.stderr?.on('data', (chunk: string) => {
    capturedOutput = (capturedOutput + chunk).slice(-MAX_CAPTURED_OUTPUT_CHARS)
  })

  server.on('error', (error: Error) => {
    failureReasons.push(`it could not be started (${error.message})`)
  })

  server.on('exit', (code, signal) => {
    failureReasons.push(signal ? `it was killed by ${signal}` : `it exited with code ${code}`)
  })

  server.unref()

  /** `unref` is not on `Readable`, so the pipe can only be released once it is known to be a socket. */
  if (server.stderr instanceof net.Socket) {
    server.stderr.unref()
  }

  try {
    const deadline = Date.now() + READY_TIMEOUT_MS

    while (Date.now() < deadline) {
      if (await isServerListening()) {
        return
      }

      if (failureReasons.length > 0) {
        throw new Error(
          `The production server stopped before it accepted connections: ${failureReasons[0]}. ` +
            `Run \`pnpm build\` first.${describeOutput(capturedOutput)}`,
        )
      }

      await delay(PROBE_INTERVAL_MS)
    }

    throw new Error(
      `The production server did not start listening on port ${E2E_PORT} within ` +
        `${READY_TIMEOUT_MS / 1000}s. Run \`pnpm build\` and check its output.` +
        describeOutput(capturedOutput),
    )
  } catch (error) {
    /** Playwright skips `globalTeardown` when setup throws, so the spawned server is reaped here. */
    server.kill()
    stopServer()

    throw error
  }
}
