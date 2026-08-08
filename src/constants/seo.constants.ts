import { AUTHOR_GITHUB_URL, BIRTH_DATE, EMAIL, PHONE } from '@/constants/constants'
import { asideSocialLinks } from '@/constants/aside.constants'

/** Canonical production origin of the portfolio, shared by metadata, sitemap, robots and JSON-LD. */
export const SITE_URL = 'https://nkolosov.com'

/** Human-readable site name surfaced in Open Graph, Twitter cards and structured data. */
export const SITE_NAME = 'NKolosov097 Portfolio'

/** Document title used for the browser tab and social previews. */
export const SITE_TITLE = 'Portfolio NKolosov097'

/** Marketing description reused across meta tags and structured data. */
export const SITE_DESCRIPTION = 'Portfolio about super developer @NKolosov097!'

/** Full name of the portfolio owner, used as the structured-data subject. */
export const AUTHOR_NAME = 'Nikita Kolosov'

/** Primary job title of the portfolio owner. */
export const AUTHOR_JOB_TITLE = 'Software Engineer'

/** Twitter/X handle of the owner, used as the Twitter card author. */
export const AUTHOR_TWITTER_HANDLE = '@NKolosov097'

/** Absolute URL of the owner's avatar photo, used as the structured-data `Person.image`. */
export const AUTHOR_IMAGE_URL = `${SITE_URL}/assets/img/avatar/avatar.webp`

/** Technologies the owner works with — feeds both meta keywords and structured-data `knowsAbout`. */
export const AUTHOR_SKILLS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'NestJS',
  'Zustand',
  'Redux Toolkit',
  'PostgreSQL',
  'Prisma',
]

/** Search keywords describing the portfolio and its owner. */
export const SITE_KEYWORDS = [
  AUTHOR_NAME,
  'NKolosov097',
  AUTHOR_JOB_TITLE,
  'Frontend Developer',
  'Web Developer',
  'Portfolio',
  ...AUTHOR_SKILLS,
]

/**
 * Absolute URLs of the owner's public social profiles, used as structured-data `sameAs`.
 * Deduplicated because {@link AUTHOR_GITHUB_URL} is also present among the aside links.
 */
export const AUTHOR_SAME_AS = Array.from(
  new Set([...asideSocialLinks.map((socialLink) => socialLink.href), AUTHOR_GITHUB_URL]),
)

/** Birth date of the owner in ISO `YYYY-MM-DD` form, derived from {@link BIRTH_DATE} in local time. */
export const AUTHOR_BIRTH_DATE_ISO = [
  BIRTH_DATE.getFullYear(),
  String(BIRTH_DATE.getMonth() + 1).padStart(2, '0'),
  String(BIRTH_DATE.getDate()).padStart(2, '0'),
].join('-')

/**
 * Schema.org JSON-LD document embedded in the document head. Combines a `Person`
 * (the portfolio owner) and the `WebSite` itself under a single `@graph`, so search
 * engines can attribute the site to a described individual.
 */
export const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: AUTHOR_NAME,
      url: SITE_URL,
      image: AUTHOR_IMAGE_URL,
      jobTitle: AUTHOR_JOB_TITLE,
      email: EMAIL,
      telephone: PHONE.replace(/[^+\d]/g, ''),
      birthDate: AUTHOR_BIRTH_DATE_ISO,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Moscow',
        addressCountry: 'RU',
      },
      knowsAbout: AUTHOR_SKILLS,
      sameAs: AUTHOR_SAME_AS,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: ['en', 'ru'],
      author: { '@id': `${SITE_URL}/#person` },
    },
  ],
}
