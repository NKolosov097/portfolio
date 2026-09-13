import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { resolveTrustedIdentity } from '@/home-sections/Contact/services/submission-policy'

describe('resolveTrustedIdentity', () => {
  it('uses only the explicitly configured header with a canonical IP value', () => {
    expect(
      resolveTrustedIdentity(new Headers({ 'x-feedback-test-ip': '192.0.2.12' }), {
        NODE_ENV: 'production',
        CONTACT_TRUSTED_IP_HEADER: 'x-feedback-test-ip',
      }),
    ).toBe('192.0.2.12')
    expect(
      resolveTrustedIdentity(new Headers({ 'x-forwarded-for': '192.0.2.99' }), {
        NODE_ENV: 'production',
        CONTACT_TRUSTED_IP_HEADER: 'x-feedback-test-ip',
      }),
    ).toBeNull()
  })

  it('rejects forwarding lists and malformed identity', () => {
    const env = { NODE_ENV: 'production' as const, CONTACT_TRUSTED_IP_HEADER: 'x-forwarded-for' }
    expect(
      resolveTrustedIdentity(new Headers({ 'x-forwarded-for': '192.0.2.1, 10.0.0.1' }), env),
    ).toBeNull()
    expect(resolveTrustedIdentity(new Headers({ 'x-forwarded-for': 'not-an-ip' }), env)).toBeNull()
  })

  it('uses a constant loopback identity only outside production when no header is configured', () => {
    expect(resolveTrustedIdentity(new Headers(), { NODE_ENV: 'development' })).toBe('127.0.0.1')
    expect(resolveTrustedIdentity(new Headers(), { NODE_ENV: 'production' })).toBeNull()
  })
})
