import './load-env'

import { getContactPool } from '../src/db/client'
import { runContactNotificationRetry } from '../src/home-sections/Contact/services/run-contact-retry'

const main = async () => {
  const pool = getContactPool()
  try {
    await runContactNotificationRetry(pool)
  } finally {
    await pool.end()
  }
}

void main().catch(() => {
  console.error('Contact notification retry failed')
  process.exitCode = 1
})
