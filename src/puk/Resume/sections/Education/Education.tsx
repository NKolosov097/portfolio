'use client'

import styles from '@/puk/Resume/Resume.module.css'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Table } from '@gravity-ui/uikit'

import { educationColumns, EEducationTableColumn } from '@/constants/resume.constants'

export const Education = () => {
  const { t } = useTranslation()

  const educationData: Record<string, string>[] = useMemo(
    () => [
      {
        id: 'University MAI"',
        [EEducationTableColumn.years]: '2020 - 2024',
        [EEducationTableColumn.title]: t('educationTable.MAI'),
        subtitle: t('educationTable.MAISubtitle'),
        [EEducationTableColumn.description]: t('educationTable.MAIDescription'),
        subDescription: t('educationTable.MAISubDescription'),
      },
      {
        id: 'Hexlet',
        [EEducationTableColumn.years]: '2021 - 2022',
        [EEducationTableColumn.title]: t('educationTable.Hexlet'),
        subtitle: t('educationTable.HexletSubtitle'),
        [EEducationTableColumn.description]: t('educationTable.HexletDescription'),
        subDescription: '',
      },
      {
        id: 'Yandex Practicum',
        [EEducationTableColumn.years]: '2023',
        [EEducationTableColumn.title]: t('educationTable.YandexPracticum'),
        subtitle: t('educationTable.YandexPracticumSubtitle'),
        [EEducationTableColumn.description]: t('educationTable.YandexPracticumDescription'),
        subDescription: '',
      },
    ],
    [t],
  )

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.educationHeader')}</h3>

      <Table
        columns={educationColumns}
        data={educationData}
        className={styles.educationTable}
        verticalAlign="top"
        emptyMessage={t('educationTable.emptyMessage')}
      />
    </section>
  )
}

export default Education
