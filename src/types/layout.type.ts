import { PropsWithChildren } from 'react'

export interface ILayout extends PropsWithChildren {
  params: Promise<{ lang: 'en' | 'ru' }>
}
