'use client'

import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from 'next/navigation'

// eslint-disable-next-line import/named
import { Button, DropdownMenu, DropdownMenuItem, Icon } from '@gravity-ui/uikit'
import { Globe } from '@gravity-ui/icons'

import { I18nContext } from '@/contexts/i18'

import { ELanguage, languages } from '@/constants/header.constants'
import { ISwitcherLanguageProps } from '@/types/header.type'

const Switcher = (props: ISwitcherLanguageProps) => (
  <Button {...props} aria-label="change language" size="l" view="flat">
    <Icon width={20} height={20} data={Globe} />
  </Button>
)

export const LanguageSwitcher = () => {
  const { push } = useRouter()
  const pathname = usePathname()

  const { setLanguage } = useContext(I18nContext)
  const { i18n } = useTranslation()

  const dropdownMenuItems: (DropdownMenuItem<unknown> | DropdownMenuItem<unknown>[])[] = useMemo(
    () =>
      languages.map(({ title, value }) => ({
        title,
        text: title,
        action: (event) => {
          event?.preventDefault()
          i18n.changeLanguage(value)
          setLanguage(value as ELanguage)
          push(`${pathname}?lang=${value}`)
        },
      })),
    [i18n, pathname, push, setLanguage],
  )

  return <DropdownMenu hideOnScroll renderSwitcher={Switcher} items={dropdownMenuItems} size="xl" />
}
