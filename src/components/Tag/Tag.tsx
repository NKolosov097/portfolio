import { JSX } from 'react'
import styles from './Tag.module.css'

import { Star } from '@gravity-ui/icons'

interface ITagProps {
  title: string
  icon?: JSX.Element
}

export const Tag = ({ title, icon }: ITagProps) => {
  return (
    <div className={styles.container}>
      {icon ? icon : <Star width={20} height={20} />}
      {title}
    </div>
  )
}
