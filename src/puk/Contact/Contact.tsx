'use client'

import styles from './Contact.module.css'

import { useTranslation } from 'react-i18next'
import { Form } from '@/puk/Contact/components/Form/Form'
import { Tag } from '@/components/Tag/Tag'

import { ETabID } from '@/constants/header.constants'

export const Contact = () => {
  const { t } = useTranslation()

  return (
    <section id={ETabID.contact} className={styles.section}>
      <Tag title={t('headerTabs.contact')} />

      <h2 className="section-header">{t('contact.header')}</h2>

      <Form />
    </section>
  )
}

export default Contact
