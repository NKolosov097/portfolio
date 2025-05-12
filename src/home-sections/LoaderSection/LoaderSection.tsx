'use client'

import { Loader } from '@gravity-ui/uikit'
import styles from './LoaderSection.module.css'

export const LoaderSection = () => {
  return (
    <section className={styles?.section}>
      <Loader />
    </section>
  )
}
