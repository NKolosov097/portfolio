import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { drainContactNotifications } from './retry-notifications'

const claim = {
  id: 42,
  submissionId: 'aa1d1085-6b07-4c18-99fe-dc1ee32179dc',
  name: 'Private name',
  email: 'private@example.com',
  company: '',
  profession: '',
  content: 'Private message',
  notificationAttempts: 2,
  notificationClaimToken: '54e03dda-a41e-434a-9f66-93bb8c1ea6a5',
}

describe('contact notification retry drain', () => {
  it('stops before claiming work that cannot fit inside the remaining deadline', async () => {
    const claimNext = vi.fn().mockResolvedValue(claim)

    await expect(
      drainContactNotifications({
        maxClaims: 25,
        deadlineAt: 21_999,
        now: () => 0,
        claimNext,
        deliver: vi.fn(),
      }),
    ).resolves.toMatchObject({ claimed: 0, stoppedByDeadline: true })
    expect(claimNext).not.toHaveBeenCalled()
  })

  it('reports aggregate outcomes without exposing notification data', async () => {
    const claimNext = vi
      .fn()
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce({ ...claim, id: 43 })
      .mockResolvedValueOnce({ ...claim, id: 44 })
      .mockResolvedValueOnce(null)
    const deliver = vi
      .fn()
      .mockResolvedValueOnce('sent')
      .mockResolvedValueOnce('requeued')
      .mockResolvedValueOnce('lost-lease')

    const result = await drainContactNotifications({
      maxClaims: 10,
      deadlineAt: 60_000,
      now: () => 0,
      claimNext,
      deliver,
    })

    expect(result).toEqual({
      claimed: 3,
      sent: 1,
      requeued: 1,
      lostLease: 1,
      stoppedByDeadline: false,
    })
    expect(JSON.stringify(result)).not.toContain('private@example.com')
    expect(JSON.stringify(result)).not.toContain('Private message')
  })

  it('never claims more than the configured run limit', async () => {
    const claimNext = vi.fn().mockResolvedValue(claim)

    const result = await drainContactNotifications({
      maxClaims: 2,
      deadlineAt: 60_000,
      now: () => 0,
      claimNext,
      deliver: vi.fn().mockResolvedValue('sent'),
    })

    expect(result.claimed).toBe(2)
    expect(claimNext).toHaveBeenCalledTimes(2)
  })
})
