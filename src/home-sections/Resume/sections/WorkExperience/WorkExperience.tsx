'use client'

import styles from '@/home-sections/Resume/Resume.module.css'

import { useTranslation } from 'react-i18next'

import { workExperience } from '@/constants/resume.constants'

export const WorkExperience = () => {
  const { t } = useTranslation()

  return (
    <section className={styles.subSection}>
      <h3 className={styles.subSectionHeader}>{t('resume.workExperienceHeader')}</h3>

      <ol className={styles.timeline}>
        {workExperience.map(
          ({ id, startYear, endYear, company, roleKey, descriptionKey, stack }) => (
            <li key={id} className={styles.timelineItem} data-key={`work-experience-${id}`}>
              <span className={styles.timelinePeriod}>
                <span className={styles.timelineYear}>{startYear}</span>
                <span className={styles.timelineYear}>
                  {endYear ?? t('workExperience.present')}
                </span>
              </span>

              <div className={styles.timelineContent}>
                <h4 className={styles.timelineTitle}>
                  {company}
                  <span className={styles.timelineRole}> · {t(roleKey)}</span>
                </h4>

                <p className={styles.timelineDescription}>{t(descriptionKey)}</p>

                {stack.length > 0 && (
                  <ul className={styles.timelineStack}>
                    {stack.map((tech) => (
                      <li key={tech} className={styles.timelineStackItem}>
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  )
}

export default WorkExperience
