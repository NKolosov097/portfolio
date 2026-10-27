import styles from './Header.module.css'

import { HeaderTabs } from './components/HeaderTabs/HeaderTabs'
import { LanguageSwitcher } from './components/SwitchLanguage/SwitchLanguage'
import { AppearanceToggle } from './components/AppearanceToggle/AppearanceToggle'
import { MobileAside } from '@/layout/Aside/components/MobileAside/MobileAside'

/** Site header with nav tabs and controls, plus the mobile aside it toggles. */
export const Header = () => {
  return (
    <>
      <header className={styles.header} id="page-header" tabIndex={-1}>
        <HeaderTabs />

        <div className={styles.controls}>
          <AppearanceToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <MobileAside />
    </>
  )
}
