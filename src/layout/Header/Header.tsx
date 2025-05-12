import styles from './Header.module.css'

import { HeaderTabs } from './components/HeaderTabs/HeaderTabs'
import { LanguageSwitcher } from './components/SwitchLanguage/SwitchLanguage'
import { MobileAside } from '@/layout/Aside/components/MobileAside/MobileAside'

export const Header = () => {
  return (
    <>
      <header className={styles.header} id="page-header" tabIndex={-1}>
        <HeaderTabs />
        <LanguageSwitcher />
      </header>

      <MobileAside />
    </>
  )
}
