import { act, createElement, useContext } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Form } from './Form'
import { ELanguage } from '@/constants/header.constants'
import { I18nContext } from '@/contexts/i18'
import { EContactField } from '@/home-sections/Contact/types/contact.type'
import type { ContactSubmissionState } from '@/home-sections/Contact/types/submission.type'
import { Providers } from '@/providers/Providers'

const { sendMessageMock, uploadMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
  uploadMock: vi.fn(),
}))

vi.mock('@/home-sections/Contact/actions/send-message.action', () => ({
  sendMessage: sendMessageMock,
}))
vi.mock('@vercel/blob/client', () => ({ upload: uploadMock }))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

const deferred = <T>(): Deferred<T> => {
  let resolve: Deferred<T>['resolve'] = () => undefined
  let reject: Deferred<T>['reject'] = () => undefined
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

const LanguageControl = () => {
  const { i18n, setLanguage } = useContext(I18nContext)

  return createElement(
    'button',
    {
      type: 'button',
      onClick: () => {
        void i18n.changeLanguage(ELanguage.ru)
        setLanguage(ELanguage.ru)
      },
    },
    'Russian',
  )
}

let root: Root
let host: HTMLDivElement

const getForm = () => {
  const form = host.querySelector<HTMLFormElement>('[data-testid="contact-form"]')
  if (!form) throw new Error('Contact form was not rendered')
  return form
}

const getControl = (id: string) => {
  const control = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)
  if (!control) throw new Error(`Contact control #${id} was not rendered`)
  return control
}

const getSubmitButton = () => {
  const button = host.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!button) throw new Error('Contact submit button was not rendered')
  return button
}

const getAttachmentInput = () => getControl('contact-attachments') as HTMLInputElement

const file = (name: string, type: string, size = 1_024) => {
  const value = new File(['x'], name, { type, lastModified: 1_000 })
  Object.defineProperty(value, 'size', { value: size })
  return value
}

const selectFiles = (files: File[]) => {
  const input = getAttachmentInput()
  Object.defineProperty(input, 'files', { configurable: true, value: files })
  Object.defineProperty(input, 'value', {
    configurable: true,
    writable: true,
    value: files.length ? `C:\\fakepath\\${files[0]!.name}` : '',
  })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const changeControl = (id: string, value: string) => {
  const control = getControl(id)
  const prototype =
    control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setter) throw new Error(`No native value setter for #${id}`)
  setter.call(control, value)
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

const fillValidForm = (message = 'Hello there') => {
  changeControl('contact-name', 'Peter Parker')
  changeControl('contact-email', 'peter@example.com')
  changeControl('contact-company', 'Daily Bugle')
  changeControl('contact-profession', 'Photographer')
  changeControl('contact-message', message)
}

const submit = () => {
  getForm().requestSubmit()
}

const pressMessageKey = (key: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })
  getControl('contact-message').dispatchEvent(event)
  return event
}

const submittedPayload = (call: number) => {
  const payload: unknown = sendMessageMock.mock.calls[call]?.[1]
  if (!(payload instanceof FormData))
    throw new Error(`Action call ${call} did not receive FormData`)
  return payload
}

const submittedId = (call: number) => {
  const id = submittedPayload(call).get('submissionId')
  if (typeof id !== 'string') throw new Error(`Action call ${call} did not receive a submission ID`)
  return id
}

beforeEach(async () => {
  sendMessageMock.mockReset()
  uploadMock.mockReset()
  uploadMock.mockImplementation(async (pathname: string) => ({
    url: `https://store.private.blob.vercel-storage.com/${pathname}`,
    pathname,
  }))
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  const ids = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555',
    '66666666-6666-4666-8666-666666666666',
    '77777777-7777-4777-8777-777777777777',
  ]
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
    const id = ids.shift()
    if (!id) throw new Error('Test exhausted submission IDs')
    return id
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      createElement(
        Providers,
        { initialLanguage: ELanguage.en },
        createElement(Form),
        createElement(LanguageControl),
      ),
    )
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('contact form accessibility', () => {
  it('keeps server-rendered controls disabled until hydration can receive their events', () => {
    const shell = document.createElement('div')
    shell.innerHTML = renderToString(
      createElement(Providers, { initialLanguage: ELanguage.en }, createElement(Form)),
    )

    const message = shell.querySelector<HTMLTextAreaElement>('#contact-message')
    const submitButton = shell.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(message?.disabled).toBe(true)
    expect(submitButton?.disabled).toBe(true)
  })

  it('labels all five fields and exposes stable input semantics', () => {
    for (const [id, label] of [
      ['contact-name', 'Name'],
      ['contact-email', 'Email'],
      ['contact-company', 'Company'],
      ['contact-profession', 'Profession'],
      ['contact-message', 'Message to Nikita 😏'],
    ]) {
      expect(host.querySelector(`label[for="${id}"]`)?.textContent).toBe(label)
    }

    expect(getControl('contact-email').getAttribute('type')).toBe('email')
    expect(getControl('contact-email').getAttribute('autocomplete')).toBe('email')
  })

  it('opens the native picker and previews selected images and PDFs', async () => {
    const input = getAttachmentInput()
    expect(input.multiple).toBe(true)
    expect(input.accept).toBe('application/pdf,image/jpeg,image/png')

    const picker = host.querySelector<HTMLButtonElement>('button[aria-label="Attach files"]')
    const openPicker = vi.spyOn(input, 'click').mockImplementation(() => undefined)
    await act(async () => picker?.click())
    expect(openPicker).toHaveBeenCalledOnce()

    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((blob) => `blob:${(blob as File).name}`)
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    await act(async () =>
      selectFiles([file('brief.pdf', 'application/pdf'), file('screen.png', 'image/png', 2_048)]),
    )

    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(host.querySelector('img[alt="screen.png"]')?.getAttribute('src')).toBe('blob:screen.png')

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    )
    const pdfPreview = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Preview brief.pdf"]',
    )
    await act(async () => pdfPreview?.click())
    expect(
      document.body.querySelector('iframe[title="Preview brief.pdf"]')?.getAttribute('src'),
    ).toBe('blob:brief.pdf')

    const remove = host.querySelector<HTMLButtonElement>('button[aria-label="Remove brief.pdf"]')
    await act(async () => remove?.click())
    expect(host.querySelector('button[aria-label="Preview brief.pdf"]')).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:brief.pdf')
  })

  it('focuses and associates the first invalid field without losing a later draft', async () => {
    await act(async () => {
      changeControl('contact-message', 'Please keep my draft')
      submit()
    })

    const name = getControl('contact-name')
    expect(document.activeElement).toBe(name)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    const errorId = name.getAttribute('aria-describedby')
    expect(errorId).toBe('contact-name-error')
    expect(host.querySelector(`#${errorId}`)?.textContent).toBe('Enter your name')
    expect(getControl('contact-message').value).toBe('Please keep my draft')
    expect(sendMessageMock).not.toHaveBeenCalled()
  })
})

describe('contact form action state', () => {
  it.each([
    [
      'four files',
      () => Array.from({ length: 4 }, (_, index) => file(`${index}.pdf`, 'application/pdf')),
      'Attach no more than 3 files.',
    ],
    [
      'an unsupported type',
      () => [file('notes.txt', 'text/plain')],
      'Only PDF, JPG and PNG files are supported.',
    ],
    [
      'an oversized file',
      () => [file('large.pdf', 'application/pdf', 5_242_881)],
      'Each file must be 5 MB or smaller.',
    ],
    [
      'an oversized total',
      () => [
        file('one.pdf', 'application/pdf', 4 * 1024 * 1024),
        file('two.pdf', 'application/pdf', 4 * 1024 * 1024),
        file('three.pdf', 'application/pdf', 3 * 1024 * 1024),
      ],
      'Attachments must be 10 MB or smaller in total.',
    ],
  ])('rejects %s before upload or submission', async (_case, makeFiles, error) => {
    await act(async () => fillValidForm())
    await act(async () => selectFiles(makeFiles()))
    await act(async () => submit())

    expect(host.querySelector('#contact-attachment-error')?.textContent).toBe(error)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('uploads in order, exposes busy progress, and resets files after success', async () => {
    const uploads = [
      deferred<{ url: string; pathname: string }>(),
      deferred<{ url: string; pathname: string }>(),
    ]
    const action = deferred<ContactSubmissionState>()
    uploadMock.mockImplementation(
      (
        pathname: string,
        _file: File,
        options: {
          onUploadProgress: (progress: {
            loaded: number
            total: number
            percentage: number
          }) => void
        },
      ) => {
        options.onUploadProgress({ loaded: 512, total: 1_024, percentage: 50 })
        const index = uploadMock.mock.calls.length - 1
        return uploads[index]!.promise
      },
    )
    sendMessageMock.mockReturnValueOnce(action.promise)
    await act(async () => fillValidForm())
    await act(async () =>
      selectFiles([file('brief.pdf', 'application/pdf'), file('screen.png', 'image/png')]),
    )
    await act(async () => {
      submit()
      await vi.waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(2))
    })
    expect(getForm().getAttribute('aria-busy')).toBe('true')
    expect(getAttachmentInput().disabled).toBe(true)
    expect(getSubmitButton().disabled).toBe(true)
    expect(host.querySelector('[role="status"]')?.textContent).toContain('50%')

    await act(async () => {
      for (const [index, pending] of uploads.entries()) {
        const uploadedPath = String(uploadMock.mock.calls[index]![0])
        pending.resolve({
          url: `https://store.private.blob.vercel-storage.com/${uploadedPath}`,
          pathname: uploadedPath,
        })
      }
      await Promise.all(uploads.map(({ promise }) => promise))
    })
    await vi.waitFor(() => expect(sendMessageMock).toHaveBeenCalledOnce())
    const submitted = JSON.parse(String(submittedPayload(0).get('attachments')))
    expect(submitted.map(({ name }: { name: string }) => name)).toEqual(['brief.pdf', 'screen.png'])
    expect(submitted.map(({ pathname }: { pathname: string }) => pathname)).toEqual(
      uploadMock.mock.calls.map(([uploadedPath]) => uploadedPath),
    )
    await act(async () => {
      action.resolve({ status: 'success', submissionId: submittedId(0) })
      await action.promise
    })
    expect(host.querySelector('button[aria-label="Remove brief.pdf"]')).toBeNull()
    expect(getAttachmentInput().value).toBe('')
  })

  it('preserves a failed upload draft and reuses completed uploads on unchanged action retry', async () => {
    await act(async () => fillValidForm('Keep this draft'))
    await act(async () => selectFiles([file('brief.pdf', 'application/pdf')]))
    uploadMock.mockRejectedValueOnce(new Error('upload down'))
    await act(async () => submit())
    expect(host.querySelector('#contact-attachment-error')?.textContent).toBe(
      'The files could not be uploaded. Try again.',
    )
    expect(getControl('contact-message').value).toBe('Keep this draft')
    expect(host.textContent).toContain('brief.pdf')
    expect(sendMessageMock).not.toHaveBeenCalled()

    sendMessageMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }))
    await act(async () => submit())
    await act(async () => submit())
    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(submittedPayload(1).get('submissionId')).toBe(submittedPayload(0).get('submissionId'))
  })

  it('allocates a new submission ID and upload when the selected files change', async () => {
    sendMessageMock.mockResolvedValue({
      status: 'validation-error',
      fieldErrors: { email: ['invalid_email'] },
    })
    await act(async () => fillValidForm())
    await act(async () => selectFiles([file('first.pdf', 'application/pdf')]))
    await act(async () => submit())
    await act(async () => selectFiles([file('second.pdf', 'application/pdf')]))
    await act(async () => submit())

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(submittedId(1)).not.toBe(submittedId(0))
  })

  it('focuses and retranslates an authoritative attachment error', async () => {
    sendMessageMock.mockResolvedValueOnce({
      status: 'validation-error',
      fieldErrors: { attachments: ['attachment_invalid'] },
    })
    await act(async () => fillValidForm())
    await act(async () => submit())
    expect(document.activeElement).toBe(
      host.querySelector<HTMLButtonElement>('button[aria-label="Attach files"]'),
    )
    expect(host.querySelector('#contact-attachment-error')?.textContent).toBe(
      'One of the uploaded files is invalid. Select it again.',
    )

    const languageButton = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent === 'Russian',
    )
    await act(async () => languageButton?.click())
    expect(host.querySelector('#contact-attachment-error')?.textContent).toBe(
      'Один из загруженных файлов недействителен. Выберите его заново.',
    )
  })
  it('submits from the message field on Enter', async () => {
    sendMessageMock.mockImplementationOnce(
      async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }),
    )
    await act(async () => fillValidForm())

    let event: KeyboardEvent | undefined
    await act(async () => {
      event = pressMessageKey('Enter')
    })

    expect(event?.defaultPrevented).toBe(true)
    expect(sendMessageMock).toHaveBeenCalledTimes(1)
    expect(submittedPayload(0).get(EContactField.message)).toBe('Hello there')
  })

  it('keeps Shift+Enter available for a message line break', async () => {
    await act(async () => fillValidForm())

    let event: KeyboardEvent | undefined
    await act(async () => {
      event = pressMessageKey('Enter', { shiftKey: true })
    })

    expect(event?.defaultPrevented).toBe(false)
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('does not submit while an input method editor is composing text', async () => {
    sendMessageMock.mockResolvedValueOnce({
      status: 'success',
      submissionId: '11111111-1111-4111-8111-111111111111',
    })
    await act(async () => fillValidForm())

    let event: KeyboardEvent | undefined
    await act(async () => {
      event = pressMessageKey('Enter', { isComposing: true })
    })

    expect(event?.defaultPrevented).toBe(false)
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('clears a client field error as soon as that field is edited', async () => {
    await act(async () => submit())
    expect(getControl('contact-name').getAttribute('aria-invalid')).toBe('true')

    await act(async () => changeControl('contact-name', 'P'))

    expect(getControl('contact-name').getAttribute('aria-invalid')).not.toBe('true')
    expect(host.querySelector('#contact-name-error')).toBeNull()
  })

  it('clears a server field error as soon as that field is edited', async () => {
    sendMessageMock.mockResolvedValueOnce({
      status: 'validation-error',
      fieldErrors: { email: ['invalid_email'], message: ['too_short'] },
    })
    await act(async () => fillValidForm())
    await act(async () => submit())
    expect(getControl('contact-message').getAttribute('aria-invalid')).toBe('true')

    await act(async () => changeControl('contact-message', 'Edited message'))

    expect(getControl('contact-message').getAttribute('aria-invalid')).not.toBe('true')
    expect(host.querySelector('#contact-message-error')).toBeNull()
    expect(getControl('contact-email').getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector('#contact-email-error')).not.toBeNull()
  })

  it('stays pending through the response and rapid submits dispatch once', async () => {
    const response = deferred<ContactSubmissionState>()
    sendMessageMock.mockReturnValueOnce(response.promise)
    await act(async () => fillValidForm())

    await act(async () => {
      submit()
      submit()
    })

    await vi.waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1))
    expect(submittedPayload(0).get(EContactField.name)).toBe('Peter Parker')
    expect(submittedPayload(0).get(EContactField.message)).toBe('Hello there')
    expect(submittedPayload(0).get('website')).toBe('')
    expect(submittedId(0)).toMatch(/^[0-9a-f-]{36}$/)
    expect(getForm().getAttribute('aria-busy')).toBe('true')
    expect(getSubmitButton().disabled).toBe(true)
    for (const id of [
      'contact-name',
      'contact-email',
      'contact-company',
      'contact-profession',
      'contact-message',
    ]) {
      expect(getControl(id).disabled).toBe(true)
    }

    await act(async () => {
      response.resolve({ status: 'success', submissionId: submittedId(0) })
    })

    expect(getForm().getAttribute('aria-busy')).toBe('false')
    expect(getSubmitButton().disabled).toBe(false)
  })

  it('renders server field and global errors while preserving every input', async () => {
    sendMessageMock.mockResolvedValueOnce({
      status: 'validation-error',
      fieldErrors: { name: ['required'], form: ['submission_id_invalid'] },
    })
    await act(async () => {
      fillValidForm('Please preserve this message')
      submit()
    })

    expect(document.activeElement).toBe(getControl('contact-name'))
    expect(host.querySelector('#contact-name-error')?.textContent).toBe('Enter your name')
    expect(host.querySelector('[data-testid="contact-result"]')?.textContent).toContain(
      'Please refresh the page and try again.',
    )
    expect(getControl('contact-name').value).toBe('Peter Parker')
    expect(getControl('contact-email').value).toBe('peter@example.com')
    expect(getControl('contact-company').value).toBe('Daily Bugle')
    expect(getControl('contact-profession').value).toBe('Photographer')
    expect(getControl('contact-message').value).toBe('Please preserve this message')
  })

  it('keeps the same submission ID when retrying an uncertain network failure', async () => {
    sendMessageMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }))
    await act(async () => fillValidForm())
    await act(async () => submit())

    expect(host.querySelector('[data-testid="contact-result"]')?.textContent).toBe(
      'Message service is temporarily unavailable. Please try again.',
    )
    expect(getControl('contact-message').value).toBe('Hello there')

    await act(async () => submit())

    expect(submittedPayload(1).get('submissionId')).toBe(submittedPayload(0).get('submissionId'))
  })

  it('uses a new submission ID when a rejected payload is edited', async () => {
    sendMessageMock
      .mockResolvedValueOnce({
        status: 'validation-error',
        fieldErrors: { email: ['invalid_email'] },
      })
      .mockImplementationOnce(async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }))
    await act(async () => fillValidForm())
    await act(async () => submit())
    await act(async () => changeControl('contact-message', 'A changed payload'))
    await act(async () => submit())

    expect(submittedPayload(1).get('submissionId')).not.toBe(
      submittedPayload(0).get('submissionId'),
    )
  })

  it('resets each acknowledged success once and supports a second successful send', async () => {
    sendMessageMock.mockImplementation(
      async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }),
    )

    await act(async () => fillValidForm('First message'))
    await act(async () => submit())
    expect(getControl('contact-message').value).toBe('')

    await act(async () => fillValidForm('Second message'))
    await act(async () => submit())

    expect(sendMessageMock).toHaveBeenCalledTimes(2)
    expect(submittedPayload(1).get('submissionId')).not.toBe(
      submittedPayload(0).get('submissionId'),
    )
    expect(getControl('contact-message').value).toBe('')
    expect(host.querySelector('[data-testid="contact-result"]')?.textContent).toContain(
      'The message was sent successfully!',
    )
  })

  it('does not erase input entered after a success has been acknowledged', async () => {
    vi.useFakeTimers()
    sendMessageMock.mockImplementationOnce(
      async (_state: ContactSubmissionState, payload: FormData) => ({
        status: 'success',
        submissionId: String(payload.get('submissionId')),
      }),
    )
    await act(async () => fillValidForm())
    await act(async () => submit())
    await act(async () => changeControl('contact-message', 'A newer draft'))
    await act(async () => vi.advanceTimersByTimeAsync(4_000))

    expect(getControl('contact-message').value).toBe('A newer draft')
  })

  it('does not reset a browser-restored value that is newer than the pending snapshot', async () => {
    const response = deferred<ContactSubmissionState>()
    sendMessageMock.mockReturnValueOnce(response.promise)
    await act(async () => fillValidForm('Submitted message'))
    await act(async () => submit())
    await vi.waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1))

    await act(async () => changeControl('contact-message', 'Browser-restored draft'))
    await act(async () => {
      response.resolve({ status: 'success', submissionId: submittedId(0) })
    })

    expect(getControl('contact-message').value).toBe('Browser-restored draft')
  })

  it('retranslates visible server errors when the language changes', async () => {
    sendMessageMock.mockResolvedValueOnce({
      status: 'validation-error',
      fieldErrors: { name: ['required'] },
    })
    await act(async () => fillValidForm())
    await act(async () => submit())
    expect(host.querySelector('#contact-name-error')?.textContent).toBe('Enter your name')

    const languageButton = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent === 'Russian',
    )
    if (!languageButton) throw new Error('Language control was not rendered')
    await act(async () => languageButton.click())

    expect(host.querySelector('#contact-name-error')?.textContent).toBe('Введите имя')
    expect(getControl('contact-message').value).toBe('Hello there')
  })

  it('can unmount while an action is pending without late reset work', async () => {
    const response = deferred<ContactSubmissionState>()
    sendMessageMock.mockReturnValueOnce(response.promise)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await act(async () => fillValidForm())
    act(() => submit())

    await act(async () => root.unmount())
    response.resolve({ status: 'unavailable', code: 'service_unavailable' })
    await response.promise

    expect(error).not.toHaveBeenCalled()
  })
})
