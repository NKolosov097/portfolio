import styles from '@/home-sections/Resume/Resume.module.css'

import Image from 'next/image'
// eslint-disable-next-line import/named
import { TableColumnConfig } from '@gravity-ui/uikit'

import { IFavoriteTool, IWorkExperience } from '@/home-sections/Resume/types/resume.type'

import { TOOL_LOGOS } from '@/constants/tools.constants'

/** Edge length of every tool logo in the grid, in pixels. */
const TOOL_LOGO_SIZE = 40

export const workExperience: IWorkExperience[] = [
  {
    id: 'proofix',
    startYear: '2024',
    company: 'Proofix',
    roleKey: 'workExperience.seniorSoftwareEngineerRole',
    descriptionKeys: [
      'workExperience.proofixBullet1',
      'workExperience.proofixBullet2',
      'workExperience.proofixBullet3',
      'workExperience.proofixBullet4',
      'workExperience.proofixBullet5',
      'workExperience.proofixBullet6',
    ],
    stack: [
      'Next.js',
      'LiveKit',
      'WebRTC',
      'Web Workers',
      'Framer Motion',
      'Playwright',
      'Vitest',
      'React Testing Library',
      'Redux Toolkit',
      'i18next',
      'Node.js',
      'Redis',
      'Elasticsearch',
      'DataDog',
    ],
  },
  {
    id: 'everypixel-workroom',
    startYear: '2022',
    endYear: '2024',
    company: 'Everypixel Workroom',
    roleKey: 'workExperience.middleFrontendRole',
    descriptionKeys: [
      'workExperience.everypixelBullet1',
      'workExperience.everypixelBullet2',
      'workExperience.everypixelBullet3',
      'workExperience.everypixelBullet4',
      'workExperience.everypixelBullet5',
      'workExperience.everypixelBullet6',
    ],
    stack: [
      'React 19',
      'React Router 7',
      'Redux Toolkit',
      'React Hook Form',
      'Zod',
      'Radix UI',
      'Framer Motion',
      '@tanstack/react-virtual',
      'react-dropzone',
      'async-mutex',
      'Sentry',
      'TypeScript',
      'Vite',
      'SASS',
    ],
  },
  {
    id: 'divergent',
    startYear: '2021',
    endYear: '2022',
    company: 'Divergent',
    roleKey: 'workExperience.frontendRole',
    descriptionKeys: [
      'workExperience.divergentBullet1',
      'workExperience.divergentBullet2',
      'workExperience.divergentBullet3',
      'workExperience.divergentBullet4',
      'workExperience.divergentBullet5',
    ],
    stack: ['React', 'React Hook Form', 'Zod', 'React DnD', 'Docker'],
  },
]

export const enum EResumeTableColumn {
  YEARS = 'years',
  TITLE = 'title',
  DESCRIPTION = 'description',
}

export const resumeTableColumns: TableColumnConfig<Record<string, string>>[] = [
  {
    id: EResumeTableColumn.YEARS,
    name: '',
    width: 130,
    template: (item) => (
      <span className={styles.yearsColumn}>
        {item[EResumeTableColumn.YEARS].split(' ').map((yearPart, index) => (
          <span key={`${item.id}-year-${index}`} className={styles.yearsColumnPart}>
            {yearPart}
          </span>
        ))}
      </span>
    ),
  },
  {
    id: EResumeTableColumn.TITLE,
    name: '',
    width: 230,
    className: styles.educationTitleColumn,
    template: (item) => (
      <>
        <h4 className={styles.educationTableHeader}>{item[EResumeTableColumn.TITLE]}</h4>
        {item.subtitle && <p className={styles.educationTableSubtitle}>{item.subtitle}</p>}
      </>
    ),
  },
  {
    id: EResumeTableColumn.DESCRIPTION,
    name: '',
    width: 300,
    primary: true,
    template: (item) => (
      <>
        <p className={styles.educationTableDescription}>{item[EResumeTableColumn.DESCRIPTION]}</p>

        {item.subDescription && (
          <p className={styles.educationTableSubDescription}>{item.subDescription}</p>
        )}
      </>
    ),
  },
]

export const favoriteTools: IFavoriteTool[] = TOOL_LOGOS.map(
  ({ id, title, src, width = TOOL_LOGO_SIZE }) => ({
    id,
    title,
    icon: <Image src={src} alt={title} width={width} height={TOOL_LOGO_SIZE} />,
  }),
)
