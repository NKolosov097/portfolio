import styles from '@/home-sections/AboutMe/AboutMe.module.css'

import { IAdvantage } from '@/home-sections/AboutMe/types/aboutMe.type'

export const Advantage = ({ title, description }: IAdvantage) => {
  return (
    <li className={styles.advantage}>
      <h3 className={styles.advantageHeader}>{title}</h3>
      <p className={styles.advantageDescription}>{description}</p>
    </li>
  )
}

export default Advantage
