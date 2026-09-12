import { act, createElement, useContext } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Form } from './Form'
import { ELanguage } from '@/constants/header.constants'
import { I18nContext } from '@/contexts/i18'
import type { ContactSubmissionState } from '@/home-sections/Contact/types/submission.type'
import { Providers } from '@/providers/Providers'

const { sendMessageMock } = vi.hoisted(() => ({ sendMessageMock: vi.fn() }))

vi.mock('@/home-sections/Contact/actions/send-message.action', () => ({
  sendMessage: sendMessageMock,
}))

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
    expect(submittedPayload(0).get('message')).toBe('Hello there')
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
    expect(submittedPayload(0).get('name')).toBe('Peter Parker')
    expect(submittedPayload(0).get('message')).toBe('Hello there')
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
