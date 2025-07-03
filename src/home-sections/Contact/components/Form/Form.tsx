import { startTransition, useActionState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button, Loader, TextArea, TextInput } from '@gravity-ui/uikit'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { defaultContactForm } from '@/constants/contact.constants'

import { getContactSchema } from '@/home-sections/Contact/schemas/send-message.schema'
import { IContactSchema } from '@/home-sections/Contact/types/contact.type'
import {
  ISendMessageFormState,
  sendMessage,
} from '@/home-sections/Contact/actions/send-message.action'

import styles from '@/home-sections/Contact/Contact.module.css'

export const Form = () => {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)

  const errorsMsgs: IContactSchema = useMemo(
    () => ({
      name: {
        requireName: t('contact.requireName'),
        invalidType: t('contact.invalidTypeOfName'),
      },
      email: {
        requireEmail: t('contact.requireEmail'),
        incorrectEmail: t('contact.incorrectEmail'),
      },
      company: {
        invalidType: t('contact.invalidTypeOfcompany'),
      },
      profession: {
        invalidType: t('contact.invalidTypeOfProfession'),
      },
      message: {
        requireMessage: t('contact.requireMessage'),
        invalidType: t('contact.invalidTypeOfMessage'),
      },
    }),
    [t],
  )

  const [formState, formAction] = useActionState(
    (prevState: ISendMessageFormState, payload: FormData) =>
      sendMessage(prevState, payload, errorsMsgs),
    {
      success: false,
    },
  )

  const {
    register,
    formState: { errors, isSubmitSuccessful, isLoading },
    handleSubmit,
    reset,
  } = useForm<z.output<ReturnType<typeof getContactSchema>>>({
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: defaultContactForm,
    resolver: zodResolver(getContactSchema(errorsMsgs)),
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    if (isSubmitSuccessful && formState.success) {
      timeoutId = setTimeout(reset, 3500)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [reset, isSubmitSuccessful, formState.success])

  return (
    <form
      ref={formRef}
      onSubmit={(evt) => {
        evt.preventDefault()
        handleSubmit(() => {
          startTransition(() => formAction(new FormData(formRef.current!)))
        })(evt)
      }}
      action={formAction}
      className={styles?.form}
    >
      <div className={styles.container}>
        <TextInput
          {...register('name')}
          label={t('contact.labelOfName')}
          className={styles.name}
          placeholder={t('contact.placeholderOfName')}
          error={!!errors?.name?.message}
          errorMessage={errors?.name?.message}
          disabled={isLoading}
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        <TextInput
          {...register('email')}
          label={t('contact.labelOfEmail')}
          className={styles.email}
          placeholder={t('contact.placeholderOfEmail')}
          error={!!errors?.email?.message}
          errorMessage={errors?.email?.message}
          disabled={isLoading}
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        <TextInput
          {...register('company')}
          label={t('contact.labelOfCompany')}
          className={styles.company}
          placeholder={t('contact.placeholderOfcompany')}
          error={!!errors?.company?.message}
          errorMessage={errors?.company?.message}
          disabled={isLoading}
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        <TextInput
          {...register('profession')}
          label={t('contact.labelOfProfession')}
          className={styles.profession}
          placeholder={t('contact.placeholderOfProfession')}
          error={!!errors?.profession?.message}
          errorMessage={errors?.profession?.message}
          disabled={isLoading}
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        <TextArea
          {...register('message')}
          note={t('contact.labelOfMessage')}
          className={styles.message}
          placeholder={t('contact.placeholderOfMessage')}
          error={!!errors?.message?.message}
          errorMessage={errors?.message?.message}
          disabled={isLoading}
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        {isLoading && (
          <div className={styles?.loaderContainer}>
            <Loader />
          </div>
        )}
      </div>

      <div className={styles?.footer}>
        <Button
          type="submit"
          view="outlined-action"
          size="l"
          loading={isLoading}
          className={styles.submitBtn}
        >
          {t('contact.sendMessage')}
        </Button>

        {isSubmitSuccessful && formState.success && (
          <p className={styles?.successfulSubmitTitle}>{t('contact.successfulSubmitTitle')}</p>
        )}
      </div>
    </form>
  )
}

export default Form
