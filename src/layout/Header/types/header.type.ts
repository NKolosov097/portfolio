import { ELanguage, ETabID } from '@/constants/header.constants'

export interface ILanguageItem {
  title: string
  value: ELanguage
}

export interface ISwitcherLanguageProps {
  onKeyDown: React.KeyboardEventHandler<HTMLElement>
  onClick: React.MouseEventHandler<HTMLElement>
}

export interface IPosition {
  id: ETabID
  position: number
}
