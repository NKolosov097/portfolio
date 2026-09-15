import { describe, expect, it } from 'vitest'

import {
  detectAttachmentContentType,
  sanitizeAttachmentName,
  validateAttachmentFiles,
} from './attachments'

const file = (size: number, type: string) => ({ size, type })

describe('contact attachment policy', () => {
  it('rejects a fourth file', () => {
    expect(
      validateAttachmentFiles(Array.from({ length: 4 }, () => file(1, 'application/pdf'))),
    ).toBe('too_many_files')
  })

  it('rejects unsupported, oversized, and excessive total content', () => {
    expect(validateAttachmentFiles([file(1, 'application/octet-stream')])).toBe(
      'unsupported_file_type',
    )
    expect(validateAttachmentFiles([file(5_242_881, 'application/pdf')])).toBe('file_too_large')
    expect(
      validateAttachmentFiles([
        file(5_242_880, 'application/pdf'),
        file(5_242_880, 'image/png'),
        file(1, 'image/jpeg'),
      ]),
    ).toBe('files_too_large')
  })

  it('accepts the exact limits', () => {
    expect(
      validateAttachmentFiles([file(5_242_880, 'application/pdf'), file(5_242_880, 'image/jpeg')]),
    ).toBeNull()
  })

  it('keeps only a safe bounded display filename', () => {
    expect(sanitizeAttachmentName('../folder/brief\u0000.pdf')).toBe('brief.pdf')
    expect(sanitizeAttachmentName('')).toBe('attachment')
    expect(sanitizeAttachmentName('a'.repeat(300))).toHaveLength(255)
  })

  it.each([
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 'application/pdf'],
    [new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg'],
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [new Uint8Array([0x4d, 0x5a]), null],
  ] as const)('detects the file signature', (bytes, expected) => {
    expect(detectAttachmentContentType(bytes)).toBe(expected)
  })
})
