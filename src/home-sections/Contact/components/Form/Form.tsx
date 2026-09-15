'use client'

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { zodResolver } from '@hookform/resolvers/zod'
import { CircleXmark, Paperclip, Xmark } from '@gravity-ui/icons'
import { Button, Loader, Modal, TextArea, TextInput, Tooltip } from '@gravity-ui/uikit'
import { upload } from '@vercel/blob/client'
import type { z } from 'zod'

import { defaultContactForm } from '@/constants/contact.constants'
import { sendMessage } from '@/home-sections/Contact/actions/send-message.action'
import {
  CONTACT_ATTACHMENT_TYPES,
  sanitizeAttachmentName,
  validateAttachmentFiles,
  type AttachmentErrorCode,
  type AttachmentManifestItem,
} from '@/home-sections/Contact/attachments'
import { contactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { EContactField, EContactSubmissionStatus } from '@/home-sections/Contact/types/contact.type'
import type { ContactSubmissionState } from '@/home-sections/Contact/types/submission.type'

import styles from './Form.module.css'

const CONTACT_FIELDS = [
  EContactField.name,
  EContactField.email,
  EContactField.company,
  EContactField.profession,
  EContactField.message,
] as const

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

interface UploadedAttachments {
  fingerprint: string
  submissionId: string
  manifest: AttachmentManifestItem[]
}

interface SelectedAttachment {
  file: File
  url: string
}

const getFingerprint = (payload: FormData, files: File[] = []) =>
  JSON.stringify([
    ...CONTACT_FIELDS.map((field) => [field, String(payload.get(field) ?? '')]),
    ...files.map(({ name, size, type, lastModified }) => [name, size, type, lastModified]),
  ])

const hasReusedSubmissionId = (state: ContactSubmissionState | undefined) =>
  state?.status === EContactSubmissionStatus.validationError &&
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachButtonRef = useRef<HTMLButtonElement>(null)
  const selectedAttachmentsRef = useRef<SelectedAttachment[]>([])
  const dispatchingRef = useRef(false)
  const submissionIdRef = useRef<string | null>(null)
  const activeSubmissionRef = useRef<SubmittedPayload | null>(null)
  const lastSubmissionRef = useRef<SubmittedPayload | null>(null)
  const acknowledgedSubmissionRef = useRef<string | null>(null)
  const uploadedAttachmentsRef = useRef<UploadedAttachments | null>(null)
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([])
  const [previewAttachment, setPreviewAttachment] = useState<SelectedAttachment | null>(null)
  const [attachmentError, setAttachmentError] = useState<AttachmentErrorCode | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const selectedFiles = selectedAttachments.map(({ file }) => file)

  const replaceSelectedFiles = (files: File[]) => {
    selectedAttachmentsRef.current.forEach(({ url }) => URL.revokeObjectURL(url))
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    selectedAttachmentsRef.current = next
    setSelectedAttachments(next)
    setPreviewAttachment(null)
  }

  const [submissionState, formAction, isPending] = useActionState<ContactSubmissionState, FormData>(
    async (previousState, payload) => {
      try {
        const nextState = await sendMessage(previousState, payload)
        const activeSubmission = activeSubmissionRef.current
        if (activeSubmission) lastSubmissionRef.current = { ...activeSubmission, state: nextState }
        return nextState
      } catch {
        const nextState: ContactSubmissionState = {
          status: EContactSubmissionStatus.unavailable,
          code: 'service_unavailable',
        }
        const activeSubmission = activeSubmissionRef.current
        if (activeSubmission) lastSubmissionRef.current = { ...activeSubmission, state: nextState }
        return nextState
      } finally {
        dispatchingRef.current = false
      }
    },
    { status: EContactSubmissionStatus.idle },
  )
  const [editedServerErrors, setEditedServerErrors] = useState<{
    source: ContactSubmissionState
    fields: ReadonlySet<ContactFieldName | 'attachments'>
  }>({ source: submissionState, fields: new Set() })
  const isBusy = isUploading || isPending

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
    if (submissionState.status !== EContactSubmissionStatus.success) return
    if (acknowledgedSubmissionRef.current === submissionState.submissionId) return

    const submitted = lastSubmissionRef.current
    if (!submitted || submitted.submissionId !== submissionState.submissionId) return

    acknowledgedSubmissionRef.current = submissionState.submissionId

    const currentForm = formRef.current
    if (
      currentForm &&
      getFingerprint(new FormData(currentForm), selectedFiles) === submitted.fingerprint
    ) {
      reset(defaultContactForm)
      replaceSelectedFiles([])
      setAttachmentError(null)
      setUploadProgress(0)
      uploadedAttachmentsRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    submissionIdRef.current = globalThis.crypto.randomUUID()
  }, [reset, selectedFiles, submissionState])

  useEffect(() => {
    if (submissionState.status !== EContactSubmissionStatus.validationError) return

    const firstInvalidField = CONTACT_FIELDS.find(
      (field) => submissionState.fieldErrors[field]?.length,
    )
    if (firstInvalidField) document.getElementById(`contact-${firstInvalidField}`)?.focus()
    else if (submissionState.fieldErrors.attachments?.length) attachButtonRef.current?.focus()
  }, [submissionState])

  useEffect(
    () => () => selectedAttachmentsRef.current.forEach(({ url }) => URL.revokeObjectURL(url)),
    [],
  )

  const translateAttachmentError = (code: AttachmentErrorCode | null) => {
    if (code === 'too_many_files') return t('contact.tooManyFiles')
    if (code === 'unsupported_file_type') return t('contact.unsupportedFileType')
    if (code === 'file_too_large') return t('contact.fileTooLarge')
    if (code === 'files_too_large') return t('contact.filesTooLarge')
    if (code === 'upload_failed') return t('contact.uploadFailed')
    if (code === 'attachment_invalid') return t('contact.attachmentInvalid')
    return undefined
  }

  const selectFiles = (files: File[], append = false) => {
    const nextFiles = append ? [...selectedFiles, ...files] : files
    replaceSelectedFiles(nextFiles)
    setAttachmentError(validateAttachmentFiles(nextFiles))
    setEditedServerErrors((current) => ({
      source: submissionState,
      fields: new Set(current.source === submissionState ? current.fields : []).add('attachments'),
    }))
    setUploadProgress(0)
    uploadedAttachmentsRef.current = null
    submissionIdRef.current = null
  }

  const translateFieldError = (
    field: ContactFieldName,
    code: string | undefined,
  ): string | undefined => {
    if (!code) return undefined

    if (code === 'required') {
      if (field === EContactField.name) return t('contact.requireName')
      if (field === EContactField.email) return t('contact.requireEmail')
      return t('contact.requireMessage')
    }
    if (code === 'invalid_email') return t('contact.incorrectEmail')
    if (code === 'too_short') return t('contact.requireMessage')
    if (code === 'too_long') return t('contact.tooLong')
    if (code === 'invalid_type') {
      if (field === EContactField.name) return t('contact.invalidTypeOfName')
      if (field === EContactField.company) return t('contact.invalidTypeOfcompany')
      if (field === EContactField.profession) return t('contact.invalidTypeOfProfession')
      if (field === EContactField.message) return t('contact.invalidTypeOfMessage')
      return t('contact.incorrectEmail')
    }

    return t('contact.validationError')
  }

  const getFieldError = (field: ContactFieldName) => {
    const clientMessage = errors[field]?.message
    const serverCode =
      submissionState.status === EContactSubmissionStatus.validationError &&
      !(editedServerErrors.source === submissionState && editedServerErrors.fields.has(field))
        ? submissionState.fieldErrors[field]?.[0]
        : undefined

    return translateFieldError(
      field,
      typeof clientMessage === 'string' ? clientMessage : serverCode,
    )
  }

  const getResultMessage = () => {
    if (isUploading) return t('contact.uploadingAttachments', { progress: uploadProgress })
    if (isPending) return t('contact.sending')
    if (submissionState.status === EContactSubmissionStatus.success)
      return t('contact.successfulSubmitTitle')
    if (submissionState.status === EContactSubmissionStatus.unavailable)
      return t('contact.serviceUnavailable')
    if (submissionState.status === EContactSubmissionStatus.rateLimited)
      return t('contact.rateLimited')
    if (submissionState.status === EContactSubmissionStatus.validationError) {
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
      disabled: !isHydrated || isBusy,
      error: Boolean(error),
      view: 'clear' as const,
      size: 'l' as const,
    }

    return (
      <div className={`${styles.field} ${className}`}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {field === EContactField.message ? (
          <div className={styles.messageControl}>
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
            <Tooltip
              content={
                <span className={styles.attachmentTooltip}>
                  <span>{t('contact.attachmentHintFiles')}</span>
                  <span>{t('contact.attachmentHintLimits')}</span>
                </span>
              }
              placement="top"
              openDelay={300}
            >
              <button
                ref={attachButtonRef}
                type="button"
                className={styles.attachButton}
                disabled={!isHydrated || isBusy}
                aria-label={t('contact.attachFiles')}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
              </button>
            </Tooltip>
          </div>
        ) : (
          <TextInput
            {...commonProps}
            type={field === EContactField.email ? 'email' : 'text'}
            autoComplete={
              field === EContactField.email
                ? 'email'
                : field === EContactField.name
                  ? 'name'
                  : undefined
            }
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
  const serverAttachmentError =
    submissionState.status === EContactSubmissionStatus.validationError &&
    !(editedServerErrors.source === submissionState && editedServerErrors.fields.has('attachments'))
      ? (submissionState.fieldErrors.attachments?.[0] as AttachmentErrorCode | undefined)
      : undefined
  const attachmentErrorMessage = translateAttachmentError(
    attachmentError ?? serverAttachmentError ?? null,
  )

  return (
    <form
      ref={formRef}
      data-testid="contact-form"
      aria-busy={!isHydrated || isBusy}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!isHydrated || dispatchingRef.current || isBusy) return

        dispatchingRef.current = true
        const payload = new FormData(event.currentTarget)

        void handleSubmit(
          async () => {
            const selectionError = validateAttachmentFiles(selectedFiles)
            if (selectionError) {
              setAttachmentError(selectionError)
              dispatchingRef.current = false
              attachButtonRef.current?.focus()
              return
            }

            const fingerprint = getFingerprint(payload, selectedFiles)
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

            const submissionId = submissionIdRef.current
            payload.set('submissionId', submissionId)
            const website = payload.get('website')
            payload.set('website', typeof website === 'string' ? website : '')
            const cached = uploadedAttachmentsRef.current
            let manifest: AttachmentManifestItem[]
            if (
              !cached ||
              cached.fingerprint !== fingerprint ||
              cached.submissionId !== submissionId
            ) {
              setIsUploading(true)
              setAttachmentError(null)
              setUploadProgress(0)
              const loaded = selectedFiles.map(() => 0)
              const total = selectedFiles.reduce((sum, file) => sum + file.size, 0)
              try {
                const uploaded = await Promise.all(
                  selectedFiles.map(async (file, index) => {
                    const name = sanitizeAttachmentName(file.name)
                    const pathname = `contact/${submissionId}/${globalThis.crypto.randomUUID()}-${name}`
                    const blob = await upload(pathname, file, {
                      access: 'private',
                      handleUploadUrl: '/api/contact-uploads',
                      onUploadProgress: (progress) => {
                        loaded[index] = progress.loaded
                        setUploadProgress(
                          total
                            ? Math.floor(
                                (loaded.reduce((sum, value) => sum + value, 0) / total) * 100,
                              )
                            : progress.percentage,
                        )
                      },
                    })
                    return { url: blob.url, pathname: blob.pathname, name }
                  }),
                )
                // dispatchingRef serializes submissions while this upload is pending.
                // eslint-disable-next-line require-atomic-updates
                uploadedAttachmentsRef.current = {
                  fingerprint,
                  submissionId,
                  manifest: uploaded,
                }
                manifest = uploaded
              } catch {
                setAttachmentError('upload_failed')
                dispatchingRef.current = false
                return
              } finally {
                setIsUploading(false)
              }
            } else manifest = cached.manifest
            payload.set('attachments', JSON.stringify(manifest))
            activeSubmissionRef.current = {
              fingerprint,
              submissionId,
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
        {renderField(
          EContactField.name,
          styles.name,
          t('contact.labelOfName'),
          t('contact.placeholderOfName'),
        )}

        {renderField(
          EContactField.email,
          styles.email,
          t('contact.labelOfEmail'),
          t('contact.placeholderOfEmail'),
        )}
        {renderField(
          EContactField.company,
          styles.company,
          t('contact.labelOfCompany'),
          t('contact.placeholderOfcompany'),
        )}
        {renderField(
          EContactField.profession,
          styles.profession,
          t('contact.labelOfProfession'),
          t('contact.placeholderOfProfession'),
        )}
        {renderField(
          EContactField.message,
          styles.message,
          t('contact.labelOfMessage'),
          t('contact.placeholderOfMessage'),
        )}

        <div className={styles.attachments}>
          <input
            ref={fileInputRef}
            className={styles.fileInput}
            id="contact-attachments"
            type="file"
            multiple
            tabIndex={-1}
            accept={CONTACT_ATTACHMENT_TYPES.join(',')}
            disabled={!isHydrated || isBusy}
            aria-label={t('contact.attachFiles')}
            aria-describedby={`contact-attachments-hint${attachmentErrorMessage ? ' contact-attachment-error' : ''}`}
            aria-invalid={Boolean(attachmentErrorMessage)}
            onChange={(event) => {
              const files = [...(event.currentTarget.files ?? [])]
              event.currentTarget.value = ''
              selectFiles(files, true)
            }}
          />
          {selectedAttachments.length > 0 && (
            <ul className={styles.attachmentList}>
              {selectedAttachments.map((attachment, index) => (
                <li
                  key={`${attachment.file.name}-${attachment.file.size}-${attachment.file.lastModified}`}
                >
                  <button
                    type="button"
                    className={styles.previewButton}
                    aria-label={t('contact.previewAttachment', { name: attachment.file.name })}
                    onClick={() => setPreviewAttachment(attachment)}
                  >
                    {attachment.file.type.startsWith('image/') ? (
                      <Image
                        src={attachment.url}
                        alt={attachment.file.name}
                        width={88}
                        height={88}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.pdfPreview}>
                        <strong>PDF</strong>
                        <span>{attachment.file.name}</span>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.removeAttachment}
                    disabled={isBusy}
                    aria-label={t('contact.removeAttachment', { name: attachment.file.name })}
                    onClick={() => selectFiles(selectedFiles.filter((_, item) => item !== index))}
                  >
                    <Xmark />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p id="contact-attachments-hint" className={styles.attachmentHint}>
            {t('contact.attachmentHintFiles')} {t('contact.attachmentHintLimits')}
          </p>
          {attachmentErrorMessage && (
            <p id="contact-attachment-error" className={styles.error}>
              {attachmentErrorMessage}
            </p>
          )}
        </div>

        <input
          className={styles.honeypot}
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
        />

        {isBusy && (
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
          loading={isBusy}
          disabled={!isHydrated || isBusy}
          className={styles.submitBtn}
        >
          {t('contact.sendMessage')}
        </Button>

        {resultMessage && (
          <p
            className={
              submissionState.status === EContactSubmissionStatus.success
                ? styles.successfulResult
                : styles.result
            }
            data-testid="contact-result"
            role="status"
            aria-live="polite"
          >
            {resultMessage}
          </p>
        )}
      </div>
      {previewAttachment && (
        <Modal
          open
          onOpenChange={(open) => !open && setPreviewAttachment(null)}
          disableBodyScrollLock
          contentClassName={styles.previewModalSurface}
        >
          <div className={styles.previewModal}>
            <Button
              view="flat"
              pin="circle-circle"
              size="m"
              className={styles.previewClose}
              aria-label={t('contact.closeAttachmentPreview')}
              onClick={() => setPreviewAttachment(null)}
            >
              <CircleXmark />
            </Button>
            {previewAttachment.file.type.startsWith('image/') ? (
              <Image
                src={previewAttachment.url}
                alt={previewAttachment.file.name}
                width={1200}
                height={900}
                unoptimized
              />
            ) : (
              <iframe
                src={previewAttachment.url}
                title={t('contact.previewAttachment', { name: previewAttachment.file.name })}
              />
            )}
          </div>
        </Modal>
      )}
    </form>
  )
}

export default Form
