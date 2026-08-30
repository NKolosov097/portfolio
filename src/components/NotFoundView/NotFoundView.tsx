import styles from './NotFoundView.module.css'

import Link from 'next/link'

interface INotFoundViewProps {
  /** Heading shown at the top of the not-found message. */
  heading: string
  /** Body copy explaining what wasn't found and reassuring the reader. */
  description: string
  /** Destination the recovery link navigates to. */
  linkHref: string
  /** Label shown on the recovery link. */
  linkLabel: string
  /** Stable selector for QA, e.g. `not-found-link`. */
  testId: string
}

export const NotFoundView = ({
  heading,
  description,
  linkHref,
  linkLabel,
  testId,
}: INotFoundViewProps) => (
  <section className={styles.section}>
    <h2 className={styles.header}>{heading}</h2>

    <p className={styles.description}>{description}</p>

    <Link
      href={linkHref}
      data-testid={testId}
      className={`g-link g-link_view_normal ${styles.link}`}
    >
      {linkLabel}
    </Link>
  </section>
)

export default NotFoundView
