'use client'

import styles from '@/home-sections/Resume/Resume.module.css'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Table } from '@gravity-ui/uikit'

import { resumeTableColumns, EResumeTableColumn } from '@/constants/resume.constants'

export const Education = () => {
  const { t } = useTranslation()

  const educationData: Record<string, string>[] = useMemo(
    () => [
      {
        id: 'Yandex Practicum',
        [EResumeTableColumn.YEARS]: '2023',
        [EResumeTableColumn.TITLE]: t('educationTable.YandexPracticum'),
        subtitle: t('educationTable.YandexPracticumSubtitle'),
        [EResumeTableColumn.DESCRIPTION]: t('educationTable.YandexPracticumDescription'),
        subDescription: '',
      },
      {
        id: 'Hexlet',
        [EResumeTableColumn.YEARS]: '2021 - 2022',
        [EResumeTableColumn.TITLE]: t('educationTable.Hexlet'),
        subtitle: t('educationTable.HexletSubtitle'),
        [EResumeTableColumn.DESCRIPTION]: t('educationTable.HexletDescription'),
        subDescription: '',
      },

      {
        id: 'University MAI"',
        [EResumeTableColumn.YEARS]: '2020 - 2024',
        [EResumeTableColumn.TITLE]: t('educationTable.MAI'),
        subtitle: t('educationTable.MAISubtitle'),
        [EResumeTableColumn.DESCRIPTION]: t('educationTable.MAIDescription'),
        subDescription: t('educationTable.MAISubDescription'),
      },
    ],
    [t],
  )

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.educationHeader')}</h3>

      <Table
        columns={resumeTableColumns}
        data={educationData}
        className={styles.educationTable}
        verticalAlign="top"
        emptyMessage={t('educationTable.emptyMessage')}
      />
    </section>
  )
}

export default Education
