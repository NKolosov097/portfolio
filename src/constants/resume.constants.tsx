import styles from '@/home-sections/Resume/Resume.module.css'

import Image from 'next/image'
// eslint-disable-next-line import/named
import { TableColumnConfig } from '@gravity-ui/uikit'

import { IFavoriteTool, IWorkExperience } from '@/home-sections/Resume/types/resume.type'

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
      'React Testing Library',
      'Redux Toolkit',
      'i18next',
      'Node.js',
      'Redis',
      'ElasticSearch',
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

export const favoriteTools: IFavoriteTool[] = [
  {
    id: 'react',
    icon: (
      <Image
        src="/assets/svg/tools/react.svg"
        alt="React"
        width={40}
        height={40}
        style={{ color: 'rgb(88 196 220)' }}
      />
    ),
    title: 'React',
  },
  {
    id: 'nextjs',
    icon: <Image src="/assets/svg/tools/nextjs.svg" alt="NextJS" width={40} height={40} />,
    title: 'NextJS',
  },
  {
    id: 'react-hook-form',
    icon: (
      <Image
        src="/assets/img/tools/react-hook-form.png"
        alt="React Hook Form"
        width={40}
        height={40}
      />
    ),
    title: 'React Hook Form',
  },
  {
    id: 'zod',
    icon: <Image src="/assets/svg/tools/zod.svg" alt="Zod" width={40} height={40} />,
    title: 'Zod',
  },
  {
    id: 'redux-toolkit',
    icon: (
      <Image src="/assets/svg/tools/redux-toolkit.svg" alt="Redux Toolkit" width={40} height={40} />
    ),
    title: 'Redux Toolkit',
  },
  {
    id: 'zustand',
    icon: <Image src="/assets/img/tools/zustand.ico" alt="Zustand" width={40} height={40} />,
    title: 'Zustand',
  },
  {
    id: 'framer-motion',
    icon: (
      <Image
        src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20viewBox%3D%220%200%2016%2024%22%3E%3Cpath%20d%3D%22M%2016%200%20L%2016%208%20L%208%208%20L%200%200%20Z%20M%200%208%20L%208%208%20L%2016%2016%20L%208%2016%20L%208%2024%20L%200%2016%20Z%22%20fill%3D%22rgb(255%2C%20255%2C%20255)%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E"
        alt="Framer Motion"
        width={27}
        height={40}
      />
    ),
    title: 'Framer Motion',
  },
  {
    id: 'jest',
    icon: <Image src="/assets/svg/tools/jest.svg" alt="Jest" width={40} height={40} />,
    title: 'Jest',
  },
  {
    id: 'cypress',
    icon: <Image src="/assets/img/tools/cypress.png" alt="Cypress" width={40} height={40} />,
    title: 'Cypress',
  },
  {
    id: 'playwright',
    icon: <Image src="/assets/svg/tools/playwright.svg" alt="Playwright" width={40} height={40} />,
    title: 'Playwright',
  },
  {
    id: 'nestjs',
    icon: <Image src="/assets/svg/tools/nestjs.svg" alt="NestJS" width={40} height={40} />,
    title: 'NestJS',
  },
  {
    id: 'postgresql',
    icon: <Image src="/assets/svg/tools/postgresql.svg" alt="PostgreSQL" width={40} height={40} />,
    title: 'PostgreSQL',
  },
]
