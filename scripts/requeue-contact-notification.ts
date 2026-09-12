import { z } from 'zod'

import { getContactPool } from '../src/db/client'
import { requeueTerminalNotification } from '../src/home-sections/Contact/services/notification-operations'

const submissionId = z.uuid().parse(process.argv[2])
const pool = getContactPool()

try {
  const requeued = await requeueTerminalNotification(pool, submissionId)
  console.info(JSON.stringify({ event: 'contact_notification_requeue', requeued }))
  if (!requeued) process.exitCode = 2
} finally {
  await pool.end()
}
