'use client'

import { useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

// eslint-disable-next-line import/named
import { Button, DropdownMenu, DropdownMenuItem, Icon } from '@gravity-ui/uikit'
import { Globe } from '@gravity-ui/icons'

import { languages } from '@/constants/header.constants'
import { ISwitcherLanguageProps } from '@/types/header.type'
import { useParams, usePathname, useRouter } from 'next/navigation'

const Switcher = (props: ISwitcherLanguageProps) => (
  <Button {...props} aria-label="change language" size="l" view="flat">
    <Icon width={20} height={20} data={Globe} />
  </Button>
)

export const LanguageSwitcher = () => {
  const params = useParams()
  const { push } = useRouter()
  const pathname = usePathname()

  const { i18n } = useTranslation()

  useLayoutEffect(() => {
    if (!params || Array.isArray(params.lang)) {
      return
    }

    if (params.lang) {
      i18n.changeLanguage(params.lang)
    }
  }, [])

  const dropdownMenuItems: (DropdownMenuItem<unknown> | DropdownMenuItem<unknown>[])[] = useMemo(
    () =>
      languages.map(({ title, value }) => ({
        title,
        text: title,
        action: (event) => {
          event?.preventDefault()
          i18n.changeLanguage(value)
          push(`${pathname}?lang=${value}`)
        },
      })),
    [],
  )

  return <DropdownMenu hideOnScroll renderSwitcher={Switcher} items={dropdownMenuItems} size="xl" />
}
