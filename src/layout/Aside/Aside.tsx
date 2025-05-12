'use client'

import styles from './aside.module.css'

import { Card } from '@gravity-ui/uikit'
import { AsideContent } from './components/AsideContent/AsideContent'

export const Aside = () => {
  return (
    <aside className={styles.aside}>
      <Card type="container" theme="normal" view="outlined" className={styles.container}>
        <AsideContent />
      </Card>
    </aside>
  )
}
