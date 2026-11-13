import styles from './WinterGarland.module.css'

/** Share non-interactive seasonal artwork across every document shell without layout changes. */
export const WinterGarland = () => (
  <div className={styles.garland} data-testid="winter-page-garland" aria-hidden="true">
    <span className={styles.artwork} data-testid="winter-page-garland-artwork" />
  </div>
)
