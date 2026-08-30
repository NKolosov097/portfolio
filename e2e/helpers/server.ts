import { execFileSync } from 'node:child_process'
import net from 'node:net'

/** Port the E2E suite serves the production build on. */
export const E2E_PORT = 3000

/** Origin every spec navigates against; derived from {@link E2E_PORT} so the two cannot drift. */
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

/** Resolves to `true` when something is already accepting connections on {@link E2E_PORT}. */
export const isServerListening = (): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect({ port: E2E_PORT, host: '127.0.0.1' })

    const settle = (isListening: boolean) => {
      socket.destroy()
      resolve(isListening)
    }

    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })

/** Pids holding {@link E2E_PORT} - by port, since `next start` re-spawns and outlives its pid. */
const findListeningPids = (): number[] => {
  try {
    if (process.platform === 'win32') {
      const output = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' })

      const pids = output
        .split('\n')
        .filter((line) => line.includes(`:${E2E_PORT}`) && line.includes('LISTENING'))
        .map((line) => Number(line.trim().split(/\s+/).at(-1)))

      return [...new Set(pids)].filter((pid) => Number.isInteger(pid) && pid > 0)
    }

    const output = execFileSync('lsof', ['-ti', `tcp:${E2E_PORT}`], { encoding: 'utf8' })

    return [...new Set(output.split('\n').map(Number))].filter(
      (pid) => Number.isInteger(pid) && pid > 0,
    )
  } catch {
    // Both `netstat` filtering and `lsof` exit non-zero when nothing matches.
    return []
  }
}

/** Terminates every process holding {@link E2E_PORT}, tolerating ones that already exited. */
export const stopServer = (): void => {
  for (const pid of findListeningPids()) {
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
      } else {
        process.kill(pid, 'SIGKILL')
      }
    } catch {
      // The process disappeared between discovery and the kill; nothing left to do.
    }
  }
}
