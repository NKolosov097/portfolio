import { stopE2EServer } from './helpers/server'

/** Stops only the production server started by this Playwright run. */
export default async function globalTeardown(): Promise<void> {
  await stopE2EServer()
}
