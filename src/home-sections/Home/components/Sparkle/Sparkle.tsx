import styles from './Sparkle.module.css'

export const Sparkle = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      data-testid="home-sparkle"
      className={styles.sparkle}
    >
      <path fill="currentColor" d="M12 0Q13 11 24 12 13 13 12 24 11 13 0 12 11 11 12 0Z" />
    </svg>
  )
}
