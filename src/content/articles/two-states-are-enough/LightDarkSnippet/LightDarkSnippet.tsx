'use client'

import styles from './LightDarkSnippet.module.css'

import { useTranslation } from 'react-i18next'

/** Verbatim CSS — code samples aren't localized elsewhere in this project either. */
const LIGHT_DARK_CSS = `:root {
  color-scheme: light dark;
}

body {
  background: light-dark(#fff, #111);
  color: light-dark(#111, #fff);
}`

export const LightDarkSnippet = () => {
  const { t } = useTranslation()

  return (
    <div className={styles.card} data-testid="light-dark-snippet">
      <pre className={styles.pre}>
        <code>{LIGHT_DARK_CSS}</code>
      </pre>
      <p className={styles.caption}>{t('articleContent.twoStatesAreEnough.lightDarkCaption')}</p>
    </div>
  )
}

export default LightDarkSnippet
