import { z } from 'zod'

import { getContactPool } from '../src/db/client'
import { requeueTerminalNotification } from '../src/home-sections/Contact/services/notification-operations'

const main = async () => {
  const submissionId = z.uuid().parse(process.argv[2])
  const pool = getContactPool()

  try {
    const requeued = await requeueTerminalNotification(pool, submissionId)
    console.info(JSON.stringify({ event: 'contact_notification_requeue', requeued }))
    return requeued
  } finally {
    await pool.end()
  }
}

void main()
  .then((requeued) => {
    if (!requeued) process.exitCode = 2
  })
  .catch(() => {
    console.error('Contact notification requeue failed')
    process.exitCode = 1
  })
