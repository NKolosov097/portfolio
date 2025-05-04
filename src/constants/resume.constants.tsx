/* eslint-disable no-unused-vars */

import styles from '@/home-sections/Resume/Resume.module.css'

import Image from 'next/image'
// eslint-disable-next-line import/named
import { TableColumnConfig } from '@gravity-ui/uikit'

import { IFavoriteTool } from '@/types/resume.type'

export const enum EEducationTableColumn {
  years = 'years',
  title = 'title',
  description = 'description',
}

export const educationColumns: TableColumnConfig<Record<string, string>>[] = [
  {
    id: EEducationTableColumn.years,
    name: '',
    width: 130,
    template: (item) => <span className={styles.yearsColumn}>{item.years}</span>,
  },
  {
    id: EEducationTableColumn.title,
    name: '',
    width: 230,
    template: (item) => (
      <>
        <h4 className={styles.educationTableHeader}>{item[EEducationTableColumn.title]}</h4>
        {item.subtitle && <p className={styles.educationTableSubtitle}>{item.subtitle}</p>}
      </>
    ),
  },
  {
    id: EEducationTableColumn.description,
    name: '',
    width: 300,
    primary: true,
    template: (item) => (
      <>
        <p className={styles.educationTableDescription}>
          {item[EEducationTableColumn.description]}
        </p>

        {item.subDescription && (
          <p className={styles.educationTableSubDescription}>{item.subDescription}</p>
        )}
      </>
    ),
  },
]

export const favoriteTools: IFavoriteTool[] = [
  {
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
    icon: <Image src="/assets/svg/tools/nextjs.svg" alt="NextJS" width={40} height={40} />,
    title: 'NextJS (14/15)',
  },
  {
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
    icon: <Image src="/assets/svg/tools/zod.svg" alt="Zod" width={40} height={40} />,
    title: 'Zod',
  },
  {
    icon: <Image src="/assets/svg/tools/rtk-query.svg" alt="RTK Query" width={40} height={40} />,
    title: 'RTK Query',
  },
  {
    icon: <Image src="/assets/img/tools/zustand.ico" alt="Zustand" width={40} height={40} />,
    title: 'Zustand',
  },
  {
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
    icon: <Image src="/assets/svg/tools/jest.svg" alt="Jest" width={40} height={40} />,
    title: 'Jest',
  },
  {
    icon: <Image src="/assets/img/tools/cypress.png" alt="Cypress" width={40} height={40} />,
    title: 'Cypress',
  },
  {
    icon: <Image src="/assets/svg/tools/nestjs.svg" alt="NestJS" width={40} height={40} />,
    title: 'NestJS',
  },
  {
    icon: <Image src="/assets/svg/tools/postgresql.svg" alt="PostgreSQL" width={40} height={40} />,
    title: 'PostgreSQL',
  },
]
