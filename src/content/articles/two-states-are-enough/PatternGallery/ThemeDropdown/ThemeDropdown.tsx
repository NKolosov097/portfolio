'use client'

import styles from './ThemeDropdown.module.css'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** The tri-state dropdown's own value space — an explicit shade, or the literal `'system'` option. */
export type TDropdownValue = 'light' | 'dark' | 'system'

const OPTIONS: TDropdownValue[] = ['light', 'dark', 'system']

interface IThemeDropdownProps {
  /** Currently resolved selection: an explicit override, or `'system'` when following the OS preference. */
  value: TDropdownValue
  /** Called with whichever option the reader picked. */
  onChange: (value: TDropdownValue) => void
  /** Mirrors the other patterns' neutral pre-mount state. */
  disabled: boolean
}

/** A custom listbox instead of a native `<select>` — native popup chrome differs too much across browsers to match this card's look. */
export const ThemeDropdown = ({ value, onChange, disabled }: IThemeDropdownProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const optionLabel = (option: TDropdownValue) =>
    option === 'light'
      ? t('articleContent.twoStatesAreEnough.demoLight')
      : option === 'dark'
        ? t('articleContent.twoStatesAreEnough.demoDark')
        : t('articleContent.twoStatesAreEnough.demoSystem')

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('articleContent.twoStatesAreEnough.demoSelectLabel')}: ${optionLabel(value)}`}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{optionLabel(value)}</span>
        <span className={styles.chevron} data-open={isOpen} aria-hidden="true" />
      </button>

      {isOpen && (
        <ul className={styles.menu} role="listbox">
          {OPTIONS.map((option) => (
            <li key={option} role="option" aria-selected={value === option}>
              <button
                type="button"
                className={styles.option}
                data-selected={value === option}
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
              >
                {optionLabel(option)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ThemeDropdown
