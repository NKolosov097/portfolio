'use client'

import styles from './DownloadCv.module.css'

import { useTranslation } from 'react-i18next'

import { Icon } from '@gravity-ui/uikit'
import { FileArrowDown } from '@gravity-ui/icons'

import { CV_FILE_NAME, CV_PATH } from '@/constants/constants'

export const DownloadCv = () => {
  const { t } = useTranslation()

  return (
    <a id="download-cv" href={CV_PATH} download={CV_FILE_NAME} className={styles.link}>
      <Icon data={FileArrowDown} size={18} />
      <span>{t('resume.downloadCv')}</span>
    </a>
  )
}

export default DownloadCv
