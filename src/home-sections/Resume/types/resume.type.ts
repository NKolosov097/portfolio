import { JSX } from 'react'

export interface IFavoriteTool {
  /** Stable slug used as the React key and QA anchor (`data-key`). */
  id: string
  /** Rendered logo of the tool, sized consistently across the grid. */
  icon: JSX.Element
  /** Human-readable tool name shown beneath the logo. */
  title: string
}

export interface IWorkExperience {
  /** Stable identifier used as the React key and QA anchor. */
  id: string
  /** Year the role started, shown on the timeline rail. */
  startYear: string
  /** Year the role ended; omitted while the role is ongoing (renders a localized "present"). */
  endYear?: string
  /** Company name — a proper noun kept identical across locales. */
  company: string
  /** i18n key resolving to the localized job title. */
  roleKey: string
  /** Ordered i18n keys, each resolving to one localized bullet of responsibilities and impact. */
  descriptionKeys: string[]
  /** Technologies used in the role, rendered as chips (language-independent). */
  stack: string[]
}
