'use client'

import styles from './aside.module.css'

import { Card } from '@gravity-ui/uikit'
import { AsideContent } from './components/AsideContent/AsideContent'
import { AsideFrost } from './components/AsideFrost/AsideFrost'

/** Keeps the existing profile surface intact while hosting the winter decoration. */
export const Aside = () => {
  return (
    <aside className={styles.aside} data-testid="aside-sidebar">
      <Card
        type="container"
        theme="normal"
        view="outlined"
        className={styles.container}
        data-testid="aside-surface"
      >
        <AsideContent />
      </Card>
      <AsideFrost />
    </aside>
  )
}
