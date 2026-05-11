'use client'

import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

// eslint-disable-next-line import/named
import { Button, DropdownMenu, DropdownMenuItem, Icon } from '@gravity-ui/uikit'
import { Globe } from '@gravity-ui/icons'

import { I18nContext } from '@/contexts/i18'
import { languages } from '@/constants/header.constants'
import { storeLanguage } from '@/helpers/language'
import { ISwitcherLanguageProps } from '@/layout/Header/types/header.type'

const Switcher = (props: ISwitcherLanguageProps) => (
  <Button {...props} aria-label="change language" size="l" view="flat">
    <Icon width={20} height={20} data={Globe} />
  </Button>
)

export const LanguageSwitcher = () => {
  const { setLanguage, language } = useContext(I18nContext)
  const { i18n } = useTranslation()

  const dropdownMenuItems: (DropdownMenuItem<unknown> | DropdownMenuItem<unknown>[])[] = useMemo(
    () =>
      languages.map(({ title, value }) => ({
        title,
        text: title,
        action: (event) => {
          event?.preventDefault()
          void i18n.changeLanguage(value)
          setLanguage(value)
          storeLanguage(value)
        },
        // language from context (not i18n.language) because i18n is a mutable singleton
        // whose reference never changes and would not trigger memo recomputation
        selected: language === value,
      })),
    [i18n, language, setLanguage],
  )

  return <DropdownMenu hideOnScroll renderSwitcher={Switcher} items={dropdownMenuItems} size="xl" />
}
