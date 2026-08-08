import { stopServer } from './helpers/server'

/** Shuts down the server started in `global-setup`, so the run exits instead of hanging. */
export default function globalTeardown(): void {
  stopServer()
}
