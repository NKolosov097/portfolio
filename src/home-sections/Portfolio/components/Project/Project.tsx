import styles from './Project.module.css'

import { IProject } from '@/home-sections/Portfolio/types/portfolio.type'

export const Project = ({ id }: IProject) => {
  return <li className={styles.container}>{id}</li>
}

export default Project
