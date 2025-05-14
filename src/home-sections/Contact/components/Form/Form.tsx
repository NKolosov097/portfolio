import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button, TextArea, TextInput } from '@gravity-ui/uikit'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { defaultContactForm } from '@/constants/contact.constant'
import { getContactSchema } from '@/schemas/Contact/Contact.schema'
import { IContactSchema } from '@/types/contact.types'

import styles from '@/home-sections/Contact/Contact.module.css'
import { sendMessage } from '@/requests/contact/contact.query'

export const Form = () => {
  const { t } = useTranslation()

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
      companyName: {
        invalidType: t('contact.invalidTypeOfCompanyName'),
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

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<z.infer<ReturnType<typeof getContactSchema>>>({
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: defaultContactForm,
    resolver: zodResolver(getContactSchema(errorsMsgs)),
  })

  const onSubmit = async (message: z.infer<ReturnType<typeof getContactSchema>>) => {
    const { data } = await sendMessage(message)
    console.log('data: ', data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles?.form}>
      <div className={styles.container}>
        <TextInput
          {...register('name')}
          label={t('contact.labelOfName')}
          className={styles.name}
          placeholder={t('contact.placeholderOfName')}
          error={!!errors?.name?.message}
          errorMessage={errors?.name?.message}
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
          errorPlacement="outside"
          view="clear"
          size="l"
        />

        <TextInput
          {...register('companyName')}
          label={t('contact.labelOfCompany')}
          className={styles.company}
          placeholder={t('contact.placeholderOfCompanyName')}
          error={!!errors?.companyName?.message}
          errorMessage={errors?.companyName?.message}
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
          errorPlacement="outside"
          view="clear"
          size="l"
        />
      </div>

      <Button type="submit" view="outlined-action" size="l" className={styles.submitBtn}>
        {t('contact.sendMessage')}
      </Button>
    </form>
  )
}

export default Form
