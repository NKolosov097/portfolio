'use client'

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Loader, TextArea, TextInput } from '@gravity-ui/uikit'
import type { z } from 'zod'

import { defaultContactForm } from '@/constants/contact.constants'
import { sendMessage } from '@/home-sections/Contact/actions/send-message.action'
import { contactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import type { ContactSubmissionState } from '@/home-sections/Contact/types/submission.type'

import styles from './Form.module.css'

const CONTACT_FIELDS = ['name', 'email', 'company', 'profession', 'message'] as const

const subscribeToHydration = () => () => undefined
const getHydratedSnapshot = () => true
const getServerSnapshot = () => false

type ContactFieldName = (typeof CONTACT_FIELDS)[number]
type ContactFormInput = z.input<typeof contactSchema>
type ContactFormOutput = z.output<typeof contactSchema>

interface SubmittedPayload {
  fingerprint: string
  submissionId: string
  state?: ContactSubmissionState
}

const getFingerprint = (payload: FormData) =>
  JSON.stringify(CONTACT_FIELDS.map((field) => [field, String(payload.get(field) ?? '')]))

const hasReusedSubmissionId = (state: ContactSubmissionState | undefined) =>
  state?.status === 'validation-error' &&
  (state.fieldErrors.submissionId?.includes('submission_id_reused') ||
    state.fieldErrors.form?.includes('submission_id_reused'))

export const Form = () => {
  const { t } = useTranslation()
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot,
  )
  const formRef = useRef<HTMLFormElement>(null)
  const dispatchingRef = useRef(false)
  const submissionIdRef = useRef<string | null>(null)
  const activeSubmissionRef = useRef<SubmittedPayload | null>(null)
  const lastSubmissionRef = useRef<SubmittedPayload | null>(null)
  const acknowledgedSubmissionRef = useRef<string | null>(null)

  const [submissionState, formAction, isPending] = useActionState<ContactSubmissionState, FormData>(
    async (previousState, payload) => {
      try {
        const nextState = await sendMessage(previousState, payload)
        const activeSubmission = activeSubmissionRef.current
        if (activeSubmission) lastSubmissionRef.current = { ...activeSubmission, state: nextState }
        return nextState
      } catch {
        const nextState: ContactSubmissionState = {
          status: 'unavailable',
          code: 'service_unavailable',
        }
        const activeSubmission = activeSubmissionRef.current
        if (activeSubmission) lastSubmissionRef.current = { ...activeSubmission, state: nextState }
        return nextState
      } finally {
        dispatchingRef.current = false
      }
    },
    { status: 'idle' },
  )
  const [editedServerErrors, setEditedServerErrors] = useState<{
    source: ContactSubmissionState
    fields: ReadonlySet<ContactFieldName>
  }>({ source: submissionState, fields: new Set() })

  const {
    clearErrors,
    register,
    formState: { errors },
    handleSubmit,
    reset,
    setFocus,
  } = useForm<ContactFormInput, unknown, ContactFormOutput>({
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: defaultContactForm,
    resolver: zodResolver(contactSchema),
    shouldFocusError: false,
  })

  useEffect(() => {
    if (submissionState.status !== 'success') return
    if (acknowledgedSubmissionRef.current === submissionState.submissionId) return

    const submitted = lastSubmissionRef.current
    if (!submitted || submitted.submissionId !== submissionState.submissionId) return

    acknowledgedSubmissionRef.current = submissionState.submissionId

    const currentForm = formRef.current
    if (currentForm && getFingerprint(new FormData(currentForm)) === submitted.fingerprint) {
      reset(defaultContactForm)
    }

    submissionIdRef.current = globalThis.crypto.randomUUID()
  }, [reset, submissionState])

  useEffect(() => {
    if (submissionState.status !== 'validation-error') return

    const firstInvalidField = CONTACT_FIELDS.find(
      (field) => submissionState.fieldErrors[field]?.length,
    )
    if (firstInvalidField) document.getElementById(`contact-${firstInvalidField}`)?.focus()
  }, [submissionState])

  const translateFieldError = (
    field: ContactFieldName,
    code: string | undefined,
  ): string | undefined => {
    if (!code) return undefined

    if (code === 'required') {
      if (field === 'name') return t('contact.requireName')
      if (field === 'email') return t('contact.requireEmail')
      return t('contact.requireMessage')
    }
    if (code === 'invalid_email') return t('contact.incorrectEmail')
    if (code === 'too_short') return t('contact.requireMessage')
    if (code === 'too_long') return t('contact.tooLong')
    if (code === 'invalid_type') {
      if (field === 'name') return t('contact.invalidTypeOfName')
      if (field === 'company') return t('contact.invalidTypeOfcompany')
      if (field === 'profession') return t('contact.invalidTypeOfProfession')
      if (field === 'message') return t('contact.invalidTypeOfMessage')
      return t('contact.incorrectEmail')
    }

    return t('contact.validationError')
  }

  const getFieldError = (field: ContactFieldName) => {
    const clientMessage = errors[field]?.message
    const serverCode =
      submissionState.status === 'validation-error' &&
      !(editedServerErrors.source === submissionState && editedServerErrors.fields.has(field))
        ? submissionState.fieldErrors[field]?.[0]
        : undefined

    return translateFieldError(
      field,
      typeof clientMessage === 'string' ? clientMessage : serverCode,
    )
  }

  const getResultMessage = () => {
    if (isPending) return t('contact.sending')
    if (submissionState.status === 'success') return t('contact.successfulSubmitTitle')
    if (submissionState.status === 'unavailable') return t('contact.serviceUnavailable')
    if (submissionState.status === 'rate-limited') return t('contact.rateLimited')
    if (submissionState.status === 'validation-error') {
      const formCode =
        submissionState.fieldErrors.form?.[0] ?? submissionState.fieldErrors.submissionId?.[0]
      if (formCode === 'submission_id_reused') return t('contact.submissionIdReused')
      if (formCode === 'submission_id_invalid') return t('contact.submissionIdInvalid')
      return t('contact.validationError')
    }
    return undefined
  }

  const renderField = (
    field: ContactFieldName,
    className: string,
    label: string,
    placeholder: string,
  ) => {
    const id = `contact-${field}`
    const error = getFieldError(field)
    const errorId = `${id}-error`
    const { ref, ...registration } = register(field)
    const onChange: typeof registration.onChange = (event) => {
      const result = registration.onChange(event)
      clearErrors(field)
      setEditedServerErrors((current) => ({
        source: submissionState,
        fields: new Set(current.source === submissionState ? current.fields : []).add(field),
      }))
      return result
    }
    const commonProps = {
      ...registration,
      onChange,
      id,
      controlRef: ref,
      placeholder,
      disabled: !isHydrated || isPending,
      error: Boolean(error),
      view: 'clear' as const,
      size: 'l' as const,
    }

    return (
      <div className={`${styles.field} ${className}`}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {field === 'message' ? (
          <TextArea
            {...commonProps}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

              event.preventDefault()
              formRef.current?.requestSubmit()
            }}
            controlProps={{
              'aria-invalid': Boolean(error),
              'aria-describedby': error ? errorId : undefined,
            }}
          />
        ) : (
          <TextInput
            {...commonProps}
            type={field === 'email' ? 'email' : 'text'}
            autoComplete={field === 'email' ? 'email' : field === 'name' ? 'name' : undefined}
            controlProps={{
              'aria-invalid': Boolean(error),
              'aria-describedby': error ? errorId : undefined,
            }}
          />
        )}
        {error && (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        )}
      </div>
    )
  }

  const resultMessage = getResultMessage()

  return (
    <form
      ref={formRef}
      data-testid="contact-form"
      aria-busy={!isHydrated || isPending}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!isHydrated || dispatchingRef.current || isPending) return

        dispatchingRef.current = true
        const payload = new FormData(event.currentTarget)

        void handleSubmit(
          () => {
            const fingerprint = getFingerprint(payload)
            const lastSubmission = lastSubmissionRef.current
            const currentSubmissionId = submissionIdRef.current ?? globalThis.crypto.randomUUID()
            submissionIdRef.current = currentSubmissionId
            if (
              lastSubmission?.submissionId === currentSubmissionId &&
              (lastSubmission.fingerprint !== fingerprint ||
                hasReusedSubmissionId(lastSubmission.state))
            ) {
              submissionIdRef.current = globalThis.crypto.randomUUID()
            }

            payload.set('submissionId', submissionIdRef.current)
            const website = payload.get('website')
            payload.set('website', typeof website === 'string' ? website : '')
            activeSubmissionRef.current = {
              fingerprint,
              submissionId: submissionIdRef.current,
            }

            startTransition(() => formAction(payload))
          },
          (invalidFields) => {
            dispatchingRef.current = false
            const firstInvalidField = CONTACT_FIELDS.find((field) => invalidFields[field])
            if (firstInvalidField) setFocus(firstInvalidField)
          },
        )(event)
      }}
      className={styles.form}
    >
      <div className={styles.container}>
        {renderField('name', styles.name, t('contact.labelOfName'), t('contact.placeholderOfName'))}
        {renderField(
          'email',
          styles.email,
          t('contact.labelOfEmail'),
          t('contact.placeholderOfEmail'),
        )}
        {renderField(
          'company',
          styles.company,
          t('contact.labelOfCompany'),
          t('contact.placeholderOfcompany'),
        )}
        {renderField(
          'profession',
          styles.profession,
          t('contact.labelOfProfession'),
          t('contact.placeholderOfProfession'),
        )}
        {renderField(
          'message',
          styles.message,
          t('contact.labelOfMessage'),
          t('contact.placeholderOfMessage'),
        )}

        <input
          className={styles.honeypot}
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
        />

        {isPending && (
          <div className={styles.loaderContainer} aria-hidden="true">
            <Loader />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button
          type="submit"
          view="outlined-action"
          size="l"
          loading={isPending}
          disabled={!isHydrated || isPending}
          className={styles.submitBtn}
        >
          {t('contact.sendMessage')}
        </Button>

        {resultMessage && (
          <p
            className={
              submissionState.status === 'success' ? styles.successfulResult : styles.result
            }
            data-testid="contact-result"
            role="status"
            aria-live="polite"
          >
            {resultMessage}
          </p>
        )}
      </div>
    </form>
  )
}

export default Form
