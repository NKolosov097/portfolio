import { startE2EServer } from './helpers/server'

/** Starts the production server owned by this Playwright run. */
export default async function globalSetup(): Promise<void> {
  await startE2EServer()
}
